"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Header() {

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-lg">Bělisko</span>
            <span className="text-sm text-muted-foreground">STŘEDNÍ ODBORNÁ ŠKOLA</span>
        </Link>
      </div>
    </header>
  );
}
