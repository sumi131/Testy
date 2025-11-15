'use client';

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
  Firestore
} from 'firebase/firestore';

import {
  deleteDocumentNonBlocking,
  setDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export interface Question {
  id: string;
  text: string;
  options: {
    id: string;
    text: string;
    isCorrect?: boolean;
  }[];
  correctAnswerId?: string;
  imageSrc?: string;
};

export interface AppTest {
  id: string;
  teacherId: string;
  title: string;
  createdAt: string;
  questions: Question[];
  gradeScale: Record<string, number>;
  category: string;
};

export interface StudentResult {
  id: string;
  student: {
    id: string;
    name: string;
    surname: string;
    class: string;
    email: string;
  };
  testId: string;
  answers: Record<string, string>; // { questionId: optionId }
  score: number;
  grade: number;
  submittedAt: string;
};


// --- Tests ---

export const getAllTests = async (db: Firestore): Promise<AppTest[]> => {
  const testsCol = collection(db, 'tests');
  const testSnapshot = await getDocs(testsCol).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: 'tests',
      operation: 'list'
    }));
    throw error;
  });
  const testList = testSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AppTest));
  return testList;
};

export const getTestById = async (db: Firestore, id: string): Promise<AppTest | undefined> => {
  if (!id) return undefined;
  const testRef = doc(db, 'tests', id);
  const testSnap = await getDoc(testRef).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: testRef.path,
      operation: 'get'
    }));
    throw error;
  });
  if (testSnap.exists()) {
    return { ...testSnap.data(), id: testSnap.id } as AppTest;
  }
  return undefined;
};

export const saveTest = (db: Firestore, testToSave: AppTest): void => {
  if (!testToSave.id) {
    console.error("Cannot save test without an ID.");
    return;
  }
  const testRef = doc(db, 'tests', testToSave.id);
  setDocumentNonBlocking(testRef, testToSave, { merge: true });
};


export const deleteTest = async (db: Firestore, id: string): Promise<void> => {
  if (!id) return;
  const testRef = doc(db, 'tests', id);
  deleteDocumentNonBlocking(testRef);

  // Also delete associated results
  const resultsQuery = query(collection(db, 'results'), where('testId', '==', id));
  
  const resultsSnapshot = await getDocs(resultsQuery).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: 'results',
      operation: 'list'
    }));
    throw error;
  });

  if (resultsSnapshot.empty) {
    return;
  }
  const batch = writeBatch(db);
  resultsSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  // Non-blocking commit
  batch.commit().catch(error => {
    console.error("Error deleting results in batch:", error);
    // This is a multi-document write, creating a single contextual error is tricky.
    // For now, log the raw error. A more robust solution might involve a cloud function.
  });
};


// --- Results ---

export const getResultsForTest = async (db: Firestore, testId: string): Promise<StudentResult[]> => {
    if (!testId) return [];
    const resultsQuery = query(collection(db, 'results'), where('testId', '==', testId));
    
    const resultsSnapshot = await getDocs(resultsQuery).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'results',
        operation: 'list'
      }));
      throw error;
    });

    return resultsSnapshot.docs.map(doc => ({...doc.data(), id: doc.id} as StudentResult));
};

export const getResultById = async (db: Firestore, resultId: string): Promise<StudentResult | undefined> => {
  if (!resultId) return undefined;
  const resultRef = doc(db, 'results', resultId);
  const resultSnap = await getDoc(resultRef).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: resultRef.path,
      operation: 'get'
    }));
    throw error;
  });
  if (resultSnap.exists()) {
    return { ...resultSnap.data(), id: resultSnap.id } as StudentResult;
  }
  return undefined;
}

export const saveResult = async (db: Firestore, newResult: StudentResult): Promise<void> => {
    const resultRef = doc(db, 'results', newResult.id);
    await setDoc(resultRef, newResult, { merge: false }).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: resultRef.path,
        operation: 'create',
        requestResourceData: newResult,
      }));
      throw error;
    });
};
