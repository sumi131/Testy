'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  FileText,
  BarChart2,
  Trash2,
  Copy,
  Check,
  Loader2,
  Pencil,
  Save,
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { AppTest, getAllTests, deleteTest } from '@/lib/test-storage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

export default function TeacherDashboard() {
  const router = useRouter();
  const db = useFirestore();
  const [tests, setTests] = useState<AppTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [copiedTestId, setCopiedTestId] = useState<string | null>(null);

  const [dashboardTitle, setDashboardTitle] = useState('Moje testy');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(dashboardTitle);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTitle = localStorage.getItem('dashboardTitle');
      if (savedTitle) {
        setDashboardTitle(savedTitle);
        setTempTitle(savedTitle);
      }
    }
  }, []);

  const handleTitleSave = () => {
    setDashboardTitle(tempTitle);
    localStorage.setItem('dashboardTitle', tempTitle);
    setIsEditingTitle(false);
    toast({ title: 'Název nástěnky uložen.' });
  };

  useEffect(() => {
    const fetchTests = async () => {
      if (!db) return;
      setIsLoading(true);
      try {
        const allTests = await getAllTests(db);
        setTests(
          allTests.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Chyba při načítání testů',
          description:
            'Nepodařilo se načíst data. Zkontrolujte prosím konzoli pro více informací.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchTests();
  }, [db, toast]);

  const handleDeleteTest = async (testId: string) => {
    if (!db) return;
    await deleteTest(db, testId);
    const allTests = await getAllTests(db);
    setTests(
      allTests.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
    toast({
      title: 'Test smazán',
      description: 'Test byl úspěšně odstraněn.',
    });
  };

  const handleCopyLink = (test: AppTest) => {
    if (typeof window === 'undefined' || !window.navigator?.clipboard) {
      toast({
        variant: 'destructive',
        title: 'Chyba',
        description:
          'Kopírování do schránky není v tomto prohlížeči podporováno.',
      });
      return;
    }

    const testUrl = `${window.location.origin}/test/${test.id}/take`;

    navigator.clipboard
      .writeText(testUrl)
      .then(() => {
        setCopiedTestId(test.id);
        toast({
          title: 'Odkaz zkopírován!',
          description: 'Plný odkaz na test je připraven ke sdílení.',
        });
        setTimeout(() => setCopiedTestId(null), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        toast({
          variant: 'destructive',
          title: 'Chyba při kopírování',
          description: 'Nepodařilo se zkopírovat odkaz do schránky.',
        });
      });
  };

  const categories = useMemo(() => {
    const allCategories = tests.map((t) => t.category || 'Nekategorizováno');
    return ['Všechny', ...Array.from(new Set(allCategories))];
  }, [tests]);

  const TestCard = ({ test }: { test: AppTest }) => (
    <Card key={test.id} className="flex flex-col">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="font-headline text-base">{test.title}</CardTitle>
            <CardDescription className="text-xs">
              {test.questions.length} otázek &bull;{' '}
              {new Date(test.createdAt).toLocaleDateString('cs-CZ')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardFooter className="flex gap-2 p-4 pt-0">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => handleCopyLink(test)}
        >
          {copiedTestId === test.id ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          <span className="ml-2">Odkaz</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/test/${test.id}/results`)}
        >
          <BarChart2 className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="px-2">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Opravdu chcete smazat tento test?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tato akce je nevratná. Test "{test.title}" bude trvale odstraněn.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteTest(test.id)}>
                Smazat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-1 relative group">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="text-3xl font-bold tracking-tight h-auto p-0 border-0 shadow-none focus-visible:ring-0"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              />
              <Button size="icon" variant="ghost" onClick={handleTitleSave}>
                <Save className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight">{dashboardTitle}</h1>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditingTitle(true)}
                className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="h-5 w-5" />
              </Button>
            </>
          )}

          <p className="text-muted-foreground">
            Spravujte své testy a zobrazte si výsledky studentů.
          </p>
        </div>
        <Link href="/create-test">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Vytvořit nový test
          </Button>
        </Link>
      </div>

      <Card className="shadow-lg border border-border/80">
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin" />
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold mt-4">Zatím žádné testy</h2>
              <p className="text-muted-foreground mt-2">
                Vytvořte svůj první test a začněte zkoušet své studenty.
              </p>
              <Link href="/create-test" className="mt-4 inline-block">
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Vytvořit nový test
                </Button>
              </Link>
            </div>
          ) : (
            <Tabs defaultValue="Všechny" className="w-full">
              <TabsList className="mb-4">
                {categories.map((category) => (
                  <TabsTrigger key={category} value={category}>
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
              {categories.map((category) => (
                <TabsContent key={category} value={category}>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {(category === 'Všechny'
                      ? tests
                      : tests.filter(
                          (t) => (t.category || 'Nekategorizováno') === category
                        )
                    ).map((test) => (
                      <TestCard key={test.id} test={test} />
                    ))}
                  </div>
                  {category !== 'Všechny' &&
                    tests.filter(
                      (t) => (t.category || 'Nekategorizováno') === category
                    ).length === 0 && (
                      <p className="text-muted-foreground text-center py-10">
                        V této kategorii nejsou žádné testy.
                      </p>
                    )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
