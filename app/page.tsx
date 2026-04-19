import Link from "next/link";
import HomeExperience from "@/components/HomeExperience";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-start bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center gap-10 py-12 px-6 sm:px-10 bg-white dark:bg-black">
        <header className="flex flex-col gap-3 text-center sm:text-left sm:items-start items-center w-full">
          <span className="text-xs uppercase tracking-[0.3em] text-green-600 dark:text-green-400">
            SandoAI · Global Decentralized Dietary Telemetry
          </span>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-black dark:text-zinc-50">
            What sandwich does the world need right now?
          </h1>
          <p className="max-w-md text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Multimodal AI, an enterprise data warehouse, blockchain
            immortalization, and a real-time global verdict feed —
            collaborating to answer one question.
          </p>
          <Link
            href="/enterprise"
            className="text-xs font-mono text-green-700 dark:text-green-400 hover:underline"
          >
            → Enter the Enterprise Dashboard
          </Link>
        </header>

        <HomeExperience />
      </main>
    </div>
  );
}
