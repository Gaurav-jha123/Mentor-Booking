export interface Student {
    studentId : string;
    name : string;
    email : string;
    createdAt : string;
    updatedAt: string; 
}


export interface CreateStudentInput {
    name : string;
    email : string;
}