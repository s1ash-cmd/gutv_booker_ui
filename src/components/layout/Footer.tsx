export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-background py-6 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} GUtv Booker. Dev by <a
          href={`https://t.me/s1ash2k`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          s1ash2k
        </a></p>
      </div>
    </footer>
  );
}
