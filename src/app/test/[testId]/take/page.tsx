"use client";

import { useState, useEffect, Suspense } from "react";
import Image from 'next/image';
import { useParams, useRouter, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckSquare, Loader2, Send } from "lucide-react";
import { AppTest, saveResult, StudentResult, getTestById } from "@/lib/test-storage";
import { useFirestore } from "@/firebase";
import { cn } from "@/lib/utils";

type TestStep = 'taking' | 'details' | 'submitting';

function TestTaker() {
  const router = useRouter();
  const params = useParams();
  const db = useFirestore();
  const testId = params.testId as string;
  
  const [test, setTest] = useState<AppTest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testStep, setTestStep] = useState<TestStep>('taking');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [studentDetails, setStudentDetails] = useState({ name: '', surname: '', class: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    const fetchTest = async () => {
      if (testId) {
        try {
          const testData = await getTestById(db, testId);
          if (testData) {
            setTest(testData);
          } else {
            setError("Test s tímto ID nebyl nalezen.");
          }
        } catch (e) {
          console.error("Failed to load test data", e);
          setError("Nepodařilo se načíst data testu.");
        }
      } else {
        setError("Chybí ID testu v odkazu.");
      }
      setIsLoading(false);
    }
    fetchTest();
  }, [testId, db]);

  const handleNext = () => {
    if (test && currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setAnswers({ ...answers, [questionId]: optionId });
  };
  
  const finishTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!test || !studentDetails.name || !studentDetails.surname || !studentDetails.class) return;
    setIsSubmitting(true);

    const correctAnswersCount = test.questions.reduce((count, question) => {
      const studentAnswerId = answers[question.id];
      if (studentAnswerId && question.correctAnswerId && studentAnswerId === question.correctAnswerId) {
        return count + 1;
      }
      return count;
    }, 0);

    const score = Math.round((correctAnswersCount / test.questions.length) * 100);

    const gradeScale = test.gradeScale;
    let grade = 5;
    if (score >= gradeScale['1']) grade = 1;
    else if (score >= gradeScale['2']) grade = 2;
    else if (score >= gradeScale['3']) grade = 3;
    else if (score >= gradeScale['4']) grade = 4;
    
    const studentId = `stud-${Date.now()}`;
    const resultId = `res-${studentId}-${test.id}`;
    const resultData: StudentResult = {
      id: resultId,
      student: { id: studentId, ...studentDetails, email: `${studentDetails.name.toLowerCase()}.${studentDetails.surname.toLowerCase()}@school.com` },
      testId: test.id,
      answers,
      score,
      grade,
      submittedAt: new Date().toISOString(),
    };

    try {
      await saveResult(db, resultData);
      router.push(`/test/${test.id}/result/${resultId}`);
    } catch(e) {
      console.error("Error saving results: ", e);
      alert("Nepodařilo se uložit výsledky. Zkuste to prosím znovu.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>;
  }

  if (error) {
     return <div className="flex h-screen items-center justify-center text-red-500">{error}</div>;
  }

  if (!test) {
    return notFound();
  }
  
  if (testStep === 'details') {
    return (
      <div className="container mx-auto flex max-w-lg flex-col items-center justify-center p-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Dokončení testu</CardTitle>
            <CardDescription>
              Skvělá práce! Nyní zadejte své údaje pro odevzdání.
            </CardDescription>
          </CardHeader>
          <form onSubmit={finishTest}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Jméno</Label>
                <Input id="name" placeholder="Jan" required value={studentDetails.name} onChange={(e) => setStudentDetails({...studentDetails, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Příjmení</Label>
                <Input id="surname" placeholder="Novák" required value={studentDetails.surname} onChange={(e) => setStudentDetails({...studentDetails, surname: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Třída</Label>
                <Input id="class" placeholder="1.A" required value={studentDetails.class} onChange={(e) => setStudentDetails({...studentDetails, class: e.target.value})} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={!studentDetails.name || !studentDetails.surname || !studentDetails.class || isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isSubmitting ? 'Odesílám...' : 'Odeslat a zobrazit výsledky'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  const currentQuestion = test.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100;
  const allQuestionsAnswered = Object.keys(answers).length === test.questions.length;

  return (
    <div className="container mx-auto flex max-w-4xl flex-col items-center justify-center p-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-4">
            <p className="text-sm font-medium text-muted-foreground">
                Otázka {currentQuestionIndex + 1} z {test.questions.length}
            </p>
            <Progress value={progress} className="w-full mt-2" />
          </div>
          <CardTitle className="font-headline text-2xl">
            {currentQuestion.text}
          </CardTitle>
            {currentQuestion.imageSrc && (
                <div className="mt-4">
                    <img src={currentQuestion.imageSrc} alt={`Obrázek k otázce ${currentQuestionIndex + 1}`} className="rounded-md max-w-full h-auto" />
                </div>
            )}
        </CardHeader>
        <CardContent className="space-y-4">
          {currentQuestion.options.map((option) => (
            <div
              key={option.id}
              onClick={() => handleAnswerSelect(currentQuestion.id, option.id)}
              className={cn(
                "flex items-center space-x-3 rounded-md border p-4 cursor-pointer transition-colors hover:bg-accent/50",
                answers[currentQuestion.id] === option.id && "bg-primary/10 border-primary"
              )}
            >
              <span>{option.text}</span>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between gap-2">
            <Button variant="outline" onClick={handlePrev} disabled={currentQuestionIndex === 0} className="w-full sm:w-auto">
                <ChevronLeft className="mr-2 h-4 w-4" /> Předchozí
            </Button>

            {currentQuestionIndex === test.questions.length - 1 ? (
                 <Button 
                    variant="default" 
                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" 
                    disabled={!allQuestionsAnswered}
                    onClick={() => setTestStep('details')}
                >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Dokončit test
                </Button>
            ) : (
                <Button onClick={handleNext} className="w-full sm:w-auto">
                Další <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function TestTakingPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>}>
      <TestTaker />
    </Suspense>
  )
}
