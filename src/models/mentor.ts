export interface Mentor{
    mentorId : string;
    name : string;
    email : string;
    skills : string[];
    experience : number;
    status : 'active' | 'inactive';
    createdAt : string;
    updatedAt: string;
}

export interface CreateMentorInput {
    name : string;
    email : string;
    skills : string[];
    experience : number;
}