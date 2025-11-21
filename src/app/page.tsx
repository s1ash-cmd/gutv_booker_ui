import Image from "next/image";

export default function Home() {
    return (

        <main className="bg-[var(--background)] text-[var(--foreground)] w-full h-screen p-10 transition-colors duration-300">

            <div className="bg-[--bg] text-[--text] border-[--border] border p-5 rounded-xl">
                <h1>Тест темы</h1>
            </div>

        </main>
    );
}
