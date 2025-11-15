"use client";

import { useParams, notFound, useRouter } from "next/navigation";
import Link from 'next/link';
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Loader2, Check, X } from "lucide-react";
import { AppTest, getTestById, getResultById, StudentResult, Question } from "@/lib/test-storage";
import { useFirestore } from "@/firebase";

function StudentResultDisplay() {
  const params = useParams();
  const db = useFirestore();
  const router = useRouter();
  const testId = params.testId as string;
  const resultId = params.resultId as string;

  const [test, setTest] = useState<AppTest | null>(null);
  const [result, setResult] = useState<StudentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (db && testId && resultId) {
      const fetchData = async () => {
        setIsLoading(true);
        const testData = await getTestById(db, testId);
        const resultData = await getResultById(db, resultId);
        
        if (testData && resultData) {
          setTest(testData);
          setResult(resultData);
        }
        setIsLoading(false);
      }
      fetchData();
    }
  }, [testId, resultId, db]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>;
  }

  if (!test || !result) {
    return notFound();
  }
  
  const getOptionClass = (question: Question, optionId: string, studentAnswerId: string) => {
    const isCorrectAnswer = optionId === question.correctAnswerId;
    const isStudentChoice = optionId === studentAnswerId;

    if (isCorrectAnswer) {
      return 'border-green-500 bg-green-500/10'; // Correct answer is always green
    }
    if (isStudentChoice && !isCorrectAnswer) {
      return 'border-red-500 bg-red-500/10'; // Student's incorrect choice is red
    }
    return 'border-border'; // Default
  };
  
  const getIcon = (question: Question, optionId: string, studentAnswerId: string) => {
    const isCorrectAnswer = optionId === question.correctAnswerId;
    const isStudentChoice = optionId === studentAnswerId;

    if (isCorrectAnswer) {
        return <Check className="h-5 w-5 text-green-600" />;
    }
    if (isStudentChoice && !isCorrectAnswer) {
        return <X className="h-5 w-5 text-red-600" />;
    }
    return <div className="h-5 w-5" />; // Placeholder for spacing
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 py-12">
      <Card>
        <CardHeader className="text-center">
            <CardTitle className="font-headline text-3xl">Výsledek testu: {test.title}</CardTitle>
            <CardDescription className="text-lg">
                {result.student.name} {result.student.surname}, {result.student.class}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid gap-4 md:grid-cols-2 text-center mb-8">
                <div className="rounded-lg border bg-card text-card-foreground p-6">
                    <p className="text-sm font-medium text-muted-foreground">Celkové skóre</p>
                    <p className="text-5xl font-bold text-primary">{result.score}%</p>
                </div>
                <div className="rounded-lg border bg-card text-card-foreground p-6">
                    <p className="text-sm font-medium text-muted-foreground">Výsledná známka</p>
                    <p className="text-5xl font-bold text-primary">{result.grade}</p>
                </div>
            </div>
            
            <h3 className="text-xl font-bold mb-4 mt-8 text-center">Přehled odpovědí</h3>
            <div className="space-y-6">
                {test.questions.map((q, index) => (
                    <div key={q.id} className="p-4 border rounded-lg">
                        <p className="font-semibold text-lg">{index + 1}. {q.text}</p>
                        <div className="mt-4 space-y-2">
                           {q.options.map(opt => (
                               <div key={opt.id} className={`flex items-center justify-between p-3 rounded-md border-2 ${getOptionClass(q, opt.id, result.answers[q.id])}`}>
                                   <span>{opt.text}</span>
                                   {getIcon(q, opt.id, result.answers[q.id])}
                               </div>
                           ))}
                        </div>
                    </div>
                ))}
            </div>

        </CardContent>
      </Card>
    </div>
  );
}


export default function StudentResultPage() {
    return <StudentResultDisplay />;
}
