"use client";

import { useParams, notFound } from "next/navigation";
import Link from 'next/link';
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Home, Download, Loader2 } from "lucide-react";
import { AppTest, getTestById, getResultsForTest, StudentResult } from "@/lib/test-storage";
import { useFirestore } from "@/firebase";

interface AllTestResultsProps {
  test: AppTest;
  testResults: StudentResult[];
}

const AllTestResults: React.FC<AllTestResultsProps> = ({ test, testResults }) => {
  
  const averageScore = testResults.length > 0 ? testResults.reduce((acc, r) => acc + r.score, 0) / testResults.length : 0;
  const passRate = testResults.length > 0 ? (testResults.filter(r => r.grade <= 4).length / testResults.length) * 100 : 0;

  const exportToCsv = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Jméno,Příjmení,Třída,Skóre,Známka\n";
    testResults.forEach(res => {
        const row = `${res.student.name},${res.student.surname},${res.student.class},${res.score},${res.grade}`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${test.id}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight font-headline">{test.title} - Výsledky</h1>
          <p className="text-muted-foreground mt-1">
            Souhrn výkonu vašich studentů.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <Link href="/" className="flex-1 sm:flex-initial">
                <Button variant="outline" className="w-full"><Home className="mr-2 h-4 w-4" /> Nástěnka</Button>
            </Link>
            <Button onClick={exportToCsv} disabled={!testResults || testResults.length === 0} className="flex-1 sm:flex-initial">
                <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Studenti</CardTitle>
            <CardDescription>Celkový počet odevzdání</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{testResults.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Průměrné skóre</CardTitle>
            <CardDescription>Průměr celé třídy</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{averageScore.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Úspěšnost</CardTitle>
            <CardDescription>Známka 4 nebo lepší</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{passRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rozpis studentů</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Příjmení</TableHead>
                  <TableHead>Třída</TableHead>
                  <TableHead className="text-right">Skóre</TableHead>
                  <TableHead className="text-right">Známka</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testResults.length > 0 ? (
                  testResults
                    .sort((a,b) => b.score - a.score)
                    .map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.student.name}</TableCell>
                        <TableCell>{result.student.surname}</TableCell>
                        <TableCell>{result.student.class}</TableCell>
                        <TableCell className="text-right">{result.score}%</TableCell>
                        <TableCell className="text-right font-bold">{result.grade}</TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center p-8">
                      Zatím nebyly odevzdány žádné výsledky.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function TestResultsPage() {
  const params = useParams();
  const db = useFirestore();
  const testId = params.testId as string;

  const [test, setTest] = useState<AppTest | null>(null);
  const [testResults, setTestResults] = useState<StudentResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (testId) {
      const fetchData = async () => {
        const foundTest = await getTestById(db, testId);
        if (foundTest) {
          setTest(foundTest);
          const allResults = await getResultsForTest(db, testId);
          setTestResults(allResults);
        }
        setIsLoading(false);
      }
      fetchData();
    }
  }, [testId, db]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin" /></div>
  }
  
  if (!test || !testResults) {
      return notFound();
  }

  return <AllTestResults test={test} testResults={testResults} />;
}
