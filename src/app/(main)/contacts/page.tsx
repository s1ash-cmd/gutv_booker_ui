import { User, Send, Bug } from "lucide-react";

export default function ContactsPage() {
  return (
    <main className="bg-background py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-card rounded-lg shadow-md p-6 border border-border">
        <h1 className="text-2xl lg:text-3xl font-bold text-card-foreground mb-4 lg:mb-6">
          Контакты для связи
        </h1>

        <section className="mb-6 lg:mb-8">
          <div className="space-y-4 lg:space-y-5">
            <div className="p-4 lg:p-5 bg-secondary rounded-lg border border-border">
              <h2 className="text-lg lg:text-xl font-semibold text-secondary-foreground mb-3 lg:mb-4">
                Директор студии
              </h2>
              <div className="space-y-2 lg:space-y-2.5">
                <div className="flex items-center gap-2 lg:gap-3">
                  <User className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground shrink-0" />
                  <span className="text-foreground font-medium text-sm lg:text-base">Адельшин Джемильхан</span>
                </div>
                <div className="flex items-center gap-2 lg:gap-3">
                  <Send className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground shrink-0" />
                  <a
                    href="https://t.me/pzr_enjoyer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm lg:text-base"
                  >
                    @pzr_enjoyer
                  </a>
                </div>
              </div>
            </div>

            <div className="p-4 lg:p-5 bg-secondary rounded-lg border border-border">
              <h2 className="text-lg lg:text-xl font-semibold text-secondary-foreground mb-3 lg:mb-4">
                Технический директор
              </h2>
              <div className="space-y-2 lg:space-y-2.5">
                <div className="flex items-center gap-2 lg:gap-3">
                  <User className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground shrink-0" />
                  <span className="text-foreground font-medium text-sm lg:text-base">Кон Владислав</span>
                </div>
                <div className="flex items-center gap-2 lg:gap-3">
                  <Send className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground shrink-0" />
                  <a
                    href="https://t.me/Qineya"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm lg:text-base"
                  >
                    @Qineya
                  </a>
                </div>
              </div>
            </div>

            <div className="p-4 lg:p-5 bg-secondary rounded-lg border border-border">
              <h2 className="text-lg lg:text-xl font-semibold text-secondary-foreground mb-3 lg:mb-4">
                Заместитель тех. директора
              </h2>
              <div className="space-y-2 lg:space-y-2.5">
                <div className="flex items-center gap-2 lg:gap-3">
                  <User className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground shrink-0" />
                  <span className="text-foreground font-medium text-sm lg:text-base">Борисов Максим</span>
                </div>
                <div className="flex items-center gap-2 lg:gap-3">
                  <Send className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground shrink-0" />
                  <a
                    href="https://t.me/mspieler"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm lg:text-base"
                  >
                    @mspieler
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl lg:text-2xl font-semibold text-card-foreground mb-3 lg:mb-4 flex items-center gap-2">
            <Bug className="w-5 h-5 lg:w-6 lg:h-6" />
            Нашли баг?
          </h2>
          <div className="p-4 lg:p-5 bg-accent rounded-lg border border-border">
            <div className="space-y-2 lg:space-y-2.5">
              <div className="flex items-center gap-2 lg:gap-3">
                <User className="w-4 h-4 lg:w-5 lg:h-5 text-accent-foreground shrink-0" />
                <span className="text-accent-foreground font-medium text-sm lg:text-base">Петров Дмитрий</span>
              </div>
              <div className="flex items-center gap-2 lg:gap-3">
                <Send className="w-4 h-4 lg:w-5 lg:h-5 text-accent-foreground shrink-0" />
                <a
                  href="https://t.me/s1ash2k"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-foreground/80 hover:text-accent-foreground transition-colors text-sm lg:text-base"
                >
                  @s1ash2k
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
