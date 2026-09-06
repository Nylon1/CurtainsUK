import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateStock } from "@/lib/prestigious/availability";
import { PRESTIGIOUS_PILOT_FABRICS, PRESTIGIOUS_PILOT_FABRICS_BY_ID } from "@/lib/prestigious/pilot-fabrics";
import { getPrivateSupplierRecord, listPrivateSupplierRecords, recordManualVerification } from "@/lib/prestigious/private-supplier-records";
import type { PrestigiousStockVerificationInput } from "@/lib/prestigious/types";

export const dynamic = "force-dynamic";

async function authorised() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return Boolean(user);
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}

export async function GET(request: NextRequest) {
  if (!(await authorised())) return response({ error: "Authorised staff session required" }, 401);
  const requiredMetres = Number(request.nextUrl.searchParams.get("requiredMetres"));
  const records = listPrivateSupplierRecords();
  return response({
    persistence: "STAGING_PROCESS_MEMORY",
    fabrics: PRESTIGIOUS_PILOT_FABRICS.map((fabric) => {
      const record = records.find((candidate) => candidate.fabricSpecId === fabric.id)!;
      return {
        id: fabric.id,
        design: fabric.design,
        colour: fabric.colour,
        sku: fabric.uniqueSku,
        requiredMetres: Number.isFinite(requiredMetres) && requiredMetres > 0 ? requiredMetres : null,
        record,
        evaluation: Number.isFinite(requiredMetres) && requiredMetres > 0 ? evaluateStock(record, requiredMetres) : null,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  if (!(await authorised())) return response({ error: "Authorised staff session required" }, 401);
  const body = await request.json() as PrestigiousStockVerificationInput;
  if (!PRESTIGIOUS_PILOT_FABRICS_BY_ID.has(body.fabricSpecId)) return response({ error: "Unknown pilot fabric" }, 400);
  if (!body.verifiedAt || !Number.isFinite(Date.parse(body.verifiedAt))) return response({ error: "A valid verification timestamp is required" }, 400);
  for (const [field, value] of Object.entries(body)) {
    if (typeof value === "number" && (!Number.isFinite(value) || value < 0)) return response({ error: `${field} must be a non-negative number` }, 400);
  }
  const saved = recordManualVerification(body);
  return response({ saved, current: getPrivateSupplierRecord(body.fabricSpecId) });
}
