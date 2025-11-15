'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import mammoth from 'mammoth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileUp, X, Check, ArrowRight } from 'lucide-react';
import { AppTest, saveTest, Question as AppQuestion } from '@/lib/test-storage';
import { useFirestore } from '@/firebase';

interface ParsedQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctAnswerId: string;
  imageSrc: string | null;
}

export default function CreateTestPage() {
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [testTitle, setTestTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [gradeScale, setGradeScale] = useState({ '1': 90, '2': 75, '3': 60, '4': 40 });

  const resetState = () => {
    setFileName('');
    setIsProcessing(false);
    setParsedQuestions([]);
    setTestTitle('');
    setCategory('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseWordTestWithImages = (html: string): ParsedQuestion[] => {
    const questions: ParsedQuestion[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const elements = Array.from(doc.body.children);
  
    let currentQuestion: any = null;
  
    const finalizeQuestion = () => {
      if (currentQuestion) {
        // Basic validation before pushing
        if(currentQuestion.text && currentQuestion.options.length > 0 && currentQuestion.correctAnswerId){
           questions.push(currentQuestion);
        }
        currentQuestion = null;
      }
    };
  
    for (const element of elements) {
      const text = (element as HTMLElement).innerText.trim();
  
      if (!text && !element.querySelector('img')) continue;

      const questionMatch = text.match(/^(\d+)\.\s*(.+)/);
      if (questionMatch) {
        finalizeQuestion();
        currentQuestion = {
          id: `q-${Date.now()}-${questions.length}`,
          text: questionMatch[2],
          options: [],
          correctAnswerId: '',
          imageSrc: null,
        };
        const img = element.querySelector('img');
        if (img && img.src) {
            currentQuestion.imageSrc = img.src;
        }
        continue;
      }
  
      if (!currentQuestion) continue;
  
      const imgInP = element.querySelector('img');
      if (imgInP && imgInP.src) {
        if (!currentQuestion.imageSrc) { // Only assign if not already assigned from the question line
          currentQuestion.imageSrc = imgInP.src;
        }
        continue;
      }
  
      const answerMatch = text.match(/^([a-zA-Z])\)\s*(.+)/i);
      if (answerMatch) {
        const letter = answerMatch[1].toUpperCase();
        const answerText = answerMatch[2];
        currentQuestion.options.push({ id: letter, text: answerText });
        continue;
      }
  
      const correctMatch = text.match(/Správně:\s*([a-zA-Z])/i) || text.match(/Správná odpověď:\s*([a-zA-Z])/i);
      if (correctMatch) {
        currentQuestion.correctAnswerId = correctMatch[1].toUpperCase();
        continue;
      }
    }
  
    finalizeQuestion(); // Finalize the last question
  
    return questions;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetState();
    setFileName(file.name);
    setIsProcessing(true);
    setTestTitle(file.name.replace(/\.docx$/, ''));

    try {
      const arrayBuffer = await file.arrayBuffer();

      const result = await mammoth.convertToHtml({ arrayBuffer }, {
        convertImage: mammoth.images.imgElement(function(image) {
          return image.read("base64").then(function(imageBuffer) {
            return {
              src: "data:" + image.contentType + ";base64," + imageBuffer
            };
          });
        })
      });

      const questions = parseWordTestWithImages(result.value);

      if (questions.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Nebyly nalezeny žádné otázky',
          description: 'Ujistěte se, že je dokument správně naformátován a zkuste to znovu.',
        });
        resetState();
        return;
      }
      
      setParsedQuestions(questions);

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Chyba při zpracování souboru',
        description: error.message || 'Nepodařilo se zpracovat Word dokument.',
      });
      resetState();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = () => {
    if (!db || !testTitle || parsedQuestions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Chybějící údaje',
        description: 'Zadejte název testu a nahrajte soubor s otázkami.',
      });
      return;
    }
     const incompleteQuestions = parsedQuestions.some(
        q => !q.options || q.options.length === 0 || !q.correctAnswerId
      );
  
      if (incompleteQuestions) {
        toast({
          variant: 'destructive',
          title: 'Nekompletní test',
          description: 'Některé otázky nemají odpovědi nebo označenou správnou odpověď. Zkontrolujte prosím formátování dokumentu a náhled.',
        });
        return;
      }

    const testId = `test-${Date.now()}`;

    const finalQuestions: AppQuestion[] = parsedQuestions.map(q => {
      const question: AppQuestion = {
        id: q.id,
        text: q.text,
        options: q.options.map(opt => ({
          id: opt.id,
          text: opt.text,
        })),
        correctAnswerId: q.correctAnswerId,
      };
      if (q.imageSrc) {
        question.imageSrc = q.imageSrc;
      }
      return question;
    });

    const newTest: AppTest = {
      id: testId,
      teacherId: 'teacher-1', // Static ID for single-user setup
      title: testTitle,
      category: category || 'Nekategorizováno',
      createdAt: new Date().toISOString(),
      gradeScale,
      questions: finalQuestions
    };
    
    saveTest(db, newTest);

    toast({
      title: 'Test úspěšně vytvořen!',
      description: `Test "${testTitle}" byl uložen a je připraven k použití.`,
    });

    router.push('/');
  };

  const GradeSlider = ({
    grade,
    value,
    onChange,
  }: {
    grade: number;
    value: number;
    onChange: (value: number) => void;
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label>Známka {grade}</Label>
        <span className="font-semibold">{value}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        max={100}
        step={1}
      />
      <p className="text-xs text-muted-foreground">
        Minimální skóre pro získání známky {grade}.
      </p>
    </div>
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Vytvořit nový test</CardTitle>
          <CardDescription>
            Nahrajte Word dokument (.docx) se strukturovaným testem a my ho převedeme do digitální podoby.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Step 1: Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Krok 1: Nahrát soubor</h3>
            <div className="flex items-center gap-4 rounded-lg border border-dashed p-6">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".docx"
                className="hidden"
                disabled={isProcessing}
              />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} variant="outline">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                {isProcessing ? 'Zpracovávám...' : 'Procházet soubory'}
              </Button>
              <div className="flex-1">
                {fileName ? (
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{fileName}</span>
                    <Button variant="ghost" size="icon" onClick={resetState} className="h-6 w-6">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Vyberte soubor .docx</p>
                )}
              </div>
            </div>
          </div>
          
          {parsedQuestions.length > 0 && (
            <>
              {/* Step 2: Preview & Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Krok 2: Náhled a detaily</h3>
                <div className="space-y-4">
                    <Label htmlFor="testName">Název testu</Label>
                    <Input id="testName" value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
                </div>
                <div className="space-y-4">
                    <Label htmlFor="category">Kategorie (předmět)</Label>
                    <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Např. Matematika, Dějepis..." />
                </div>

                <div className="mt-4 rounded-lg border max-h-96 overflow-y-auto p-4 space-y-6">
                  {parsedQuestions.map((q, index) => (
                    <div key={q.id}>
                      <p className="font-semibold">{index + 1}. {q.text}</p>
                      {q.imageSrc && <img src={q.imageSrc} alt="Obrázek k otázce" className="my-2 rounded-md max-w-xs" />}
                      <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground space-y-1">
                        {q.options.map(opt => (
                          <li key={opt.id} className={opt.id === q.correctAnswerId ? 'font-bold text-green-600' : ''}>
                           {opt.text} {opt.id === q.correctAnswerId && <Check className="inline h-4 w-4 ml-1" />}
                          </li>
                        ))}
                      </ul>
                       {q.correctAnswerId && (
                        <p className="mt-2 text-xs font-bold text-blue-600 bg-blue-100 p-1 rounded-sm inline-block">
                            Správně načteno: {q.correctAnswerId}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            
              {/* Step 3: Grading */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Krok 3: Stupnice hodnocení</h3>
                <Card>
                    <CardContent className="pt-6 space-y-6">
                        <GradeSlider grade={1} value={gradeScale[1]} onChange={(v) => setGradeScale(s => ({...s, 1: v}))}/>
                        <GradeSlider grade={2} value={gradeScale[2]} onChange={(v) => setGradeScale(s => ({...s, 2: v}))}/>
                        <GradeSlider grade={3} value={gradeScale[3]} onChange={(v) => setGradeScale(s => ({...s, 3: v}))}/>
                        <GradeSlider grade={4} value={gradeScale[4]} onChange={(v) => setGradeScale(s => ({...s, 4: v}))}/>
                    </CardContent>
                </Card>
              </div>
            </>
          )}

        </CardContent>
        {parsedQuestions.length > 0 && (
          <CardFooter>
            <Button onClick={handlePublish} className="w-full sm:w-auto ml-auto" disabled={isProcessing}>
                Vytvořit a publikovat test <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
