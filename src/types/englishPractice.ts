export type PracticeType = 'speaking' | 'listening' | 'reading' | 'writing' | 'vocabulary';

export interface VocabularyWord {
  id?: string;
  word: string;
  meaning: string;
  example?: string;
}

export interface EnglishPracticeLog {
  id: string;
  date: string;
  practiceType: PracticeType;
  durationMinutes: number;
  topic: string;
  notes?: string;
  rating: number; // 1-5
  vocabulary: VocabularyWord[];
  createdAt?: string;
}
