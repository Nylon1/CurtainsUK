import {writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import type { User } from "@supabase/supabase-js";
import {createSupplierServiceClient} from "../lib/supabase/supplier-service";
import {hasSupplierAdminRole,hasSupplierPriceApprovalPermission,SUPPLIER_PRICE_APPROVAL_PERMISSION} from "../lib/supplier-intelligence/authz";
const option=(name:string)=>process.argv.find(s=>s.startsWith(`--${name}=`))?.slice(name.length+3);
async function main(){
 if(new URL(process.env.SUPABASE_URL??"").hostname!=="hqysjumypgeapgmqkcrx.supabase.co")throw Error("WRONG_AUTH_PROJECT");
 const email=option("email")?.trim().toLowerCase(),out=option("out");
 if(!email||!/^\S+@\S+\.\S+$/.test(email)||!out||!process.argv.includes("--owner-authorized"))throw Error("OWNER_AUTHORIZATION_AND_EMAIL_REQUIRED");
 const db=createSupplierServiceClient();
 const users: User[]=[];
 for(let page=1;page<=20;page++){
  const result=await db.auth.admin.listUsers({page,perPage:1000});if(result.error)throw Error("STAFF_DIRECTORY_READ_FAILED");
  users.push(...result.data.users);if(!result.data.nextPage)break;
 }
 const permissionsHash=(rows:typeof users)=>createHash("sha256").update(JSON.stringify(rows.map(u=>({id:u.id,metadata:u.app_metadata})).sort((a,b)=>a.id.localeCompare(b.id)))).digest("hex");
 const otherUsers=users.filter(u=>u.email?.toLowerCase()!==email);
 const beforeHash=permissionsHash(otherUsers);
 let user=users.find(u=>u.email?.toLowerCase()===email),created=false;
 if(!user){
  // createUser sends no email and produces no exposed password or session.
  // Email ownership is not asserted: verification remains with the normal Auth flow.
  const result=await db.auth.admin.createUser({email,email_confirm:false,app_metadata:{roles:[],permissions:[SUPPLIER_PRICE_APPROVAL_PERMISSION],provisioning_authority:"OWNER_REQUEST_PT_PRICE_APPROVAL_2026_09_25"}});
  if(result.error||!result.data.user)throw Error("STAFF_ACCOUNT_CREATE_FAILED");user=result.data.user;created=true;
 }
 const check=await db.auth.admin.getUserById(user.id);if(check.error||!check.data.user)throw Error("STAFF_ACCOUNT_READBACK_FAILED");
 const actual=check.data.user;
 if(!hasSupplierPriceApprovalPermission(actual.app_metadata)||hasSupplierAdminRole(actual.app_metadata)||JSON.stringify(actual.app_metadata.roles)!=="[]"||JSON.stringify(actual.app_metadata.permissions)!==JSON.stringify([SUPPLIER_PRICE_APPROVAL_PERMISSION]))throw Error("STAFF_PERMISSION_SCOPE_MISMATCH");
 const after=[];
 for(const prior of otherUsers){const r=await db.auth.admin.getUserById(prior.id);if(r.error||!r.data.user)throw Error("OTHER_STAFF_VERIFICATION_FAILED");after.push(r.data.user);}
 if(permissionsHash(after)!==beforeHash)throw Error("OTHER_STAFF_PERMISSIONS_CHANGED");
 const report={created,registered:true,email,actor_id:actual.id,permission:SUPPLIER_PRICE_APPROVAL_PERMISSION,broad_supplier_admin:false,other_staff_permissions_unchanged:true,email_ownership_verified:Boolean(actual.email_confirmed_at),credentials_exposed:false,created_at:actual.created_at};
 await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,actor_id:"RECORDED_IN_PRIVATE_AUDIT"}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:"STAFF_SETUP_FAILED");process.exitCode=1;});
