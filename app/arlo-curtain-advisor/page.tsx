import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import ArloAssistant from "@/components/ArloAssistant"

export default function ArloPage() {
  return (
    <main className="min-h-screen bg-apex-navy-900 text-white">

      <div className="mx-auto max-w-6xl px-6 py-20">

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <h1 className="mt-8 text-5xl font-semibold">
          Ask Arlo
        </h1>

        <p className="mt-4 max-w-xl text-white/60">
          Arlo is our specialist guide for apex, triangular and unusual
          windows. Answer a few quick questions and get the right curtain
          direction before submitting your enquiry.
        </p>

        <div className="mt-12">
          <ArloAssistant />
        </div>

      </div>

    </main>
  )
}