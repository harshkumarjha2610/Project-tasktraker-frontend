export type JobPlatform = 
  | 'linkedin' 
  | 'upwork' 
  | 'indeed' 
  | 'glassdoor' 
  | 'wellfound' 
  | 'remoteok' 
  | 'email' 
  | 'referral' 
  | 'other';

export type JobType = 
  | 'full_time' 
  | 'part_time' 
  | 'contract' 
  | 'freelance' 
  | 'internship';

export type WorkMode = 'remote' | 'hybrid' | 'onsite';

export type JobStatus = 
  | 'wishlist' 
  | 'applied' 
  | 'screening' 
  | 'interview' 
  | 'offered' 
  | 'rejected' 
  | 'accepted';

export interface JobRecord {
  id: string;
  company: string;
  position: string;
  platform: JobPlatform;
  jobType: JobType;
  workMode: WorkMode;
  salary?: string;
  status: JobStatus;
  appliedDate: string;
  jobUrl?: string;
  contactInfo?: string;
  location?: string;
  notes?: string;
  followUpDate?: string;
  rating?: number;
  createdAt?: string;
}
