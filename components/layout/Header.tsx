"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, LogOut, LogIn, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Закрываем меню при смене страницы
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Блокируем скролл body когда меню открыто
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const navItems = [
    { href: "/", label: "Навигатор", match: (p: string) => p === "/" },
    {
      href: "/blog",
      label: "Блог",
      match: (p: string) => p.startsWith("/blog"),
    },
    {
      href: "/platformy",
      label: "Платформы",
      match: (p: string) => p.startsWith("/platformy"),
    },
  ];

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link
              href="/"
              className="text-sm sm:text-base font-semibold text-foreground hover:text-primary transition-colors shrink-0"
            >
              ЦФА.Навигатор
            </Link>

            {/* Десктоп-навигация */}
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map(({ href, label, match }) => (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    match(pathname)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {label}
                </Link>
              ))}

              <span className="mx-1 h-4 w-px bg-border" />

              {!isLoading &&
                (isAuthenticated ? (
                  <div className="flex items-center gap-1">
                    <Link
                      href="/cabinet"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                        pathname.startsWith("/cabinet")
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <User className="h-3.5 w-3.5 shrink-0" />
                      {user?.firstName ??
                        user?.email?.split("@")[0] ??
                        "Кабинет"}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="p-1.5 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Выйти"
                      aria-label="Выйти из аккаунта"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/cabinet/login"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      pathname.startsWith("/cabinet")
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <LogIn className="h-3.5 w-3.5 shrink-0" />
                    Войти
                  </Link>
                ))}
            </nav>

            {/* Кнопка бургера (только мобильные) */}
            <button
              className="sm:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Мобильное меню */}
        {menuOpen && (
          <div className="sm:hidden absolute top-full left-0 right-0 border-t border-border bg-background shadow-lg z-50">
            <nav className="flex flex-col px-4 py-3 gap-1">
              {navItems.map(({ href, label, match }) => (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    match(pathname)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {label}
                </Link>
              ))}

              <div className="my-1 h-px bg-border" />

              {!isLoading &&
                (isAuthenticated ? (
                  <>
                    <Link
                      href="/cabinet"
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        pathname.startsWith("/cabinet")
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <User className="h-4 w-4 shrink-0" />
                      {user?.firstName ??
                        user?.email?.split("@")[0] ??
                        "Кабинет"}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      Выйти
                    </button>
                  </>
                ) : (
                  <Link
                    href="/cabinet/login"
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith("/cabinet")
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <LogIn className="h-4 w-4 shrink-0" />
                    Войти
                  </Link>
                ))}
            </nav>
          </div>
        )}
      </header>

      {/* Оверлей — закрывает меню при клике снаружи */}
      {menuOpen && (
        <div
          className="sm:hidden fixed inset-0 z-40"
          onClick={() => {
            setMenuOpen(false);
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
}
