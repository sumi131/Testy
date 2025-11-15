"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ThankYouPage() {
  const router = useRouter();

  useEffect(() => {
    // This page is deprecated and should redirect. If a user lands here,
    // send them to the homepage as we don't have the result context.
    router.replace('/');
  }, [router]);

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
          <CardTitle className="font-headline text-2xl">Test odevzdán!</CardTitle>
          <CardDescription>
            Děkujeme za vyplnění testu. Budete přesměrováni.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-center text-muted-foreground text-sm">
                Váš učitel bude informován o vašich výsledcích.
            </p>
        </CardContent>
        <CardFooter>
          <Link href="/" className="w-full">
            <Button variant="secondary" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Zpět na hlavní stránku
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
