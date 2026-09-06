export type ApproachPlatform = 'upwork' | 'linkedin' | 'email' | 'twitter' | 'fiverr' | 'call' | 'other';
export type ApproachType = 'proposal' | 'cold_pitch' | 'followup' | 'call' | 'other';
export type ApproachStatus = 'pending' | 'replied' | 'meeting' | 'converted' | 'rejected';

export interface ClientApproachRecord {
  id: string;
  date: string;
  clientName: string;
  platform: ApproachPlatform;
  approachType: ApproachType;
  status: ApproachStatus;
  dealValue?: number;
  notes?: string;
  followUpDate?: string;
  createdAt?: string;
}
