import { Mentor, CreateMentorInput } from "../models/mentor";
import { MentorRepository } from "../repositories/mentorRepository";

export class MentorService {
    private mentorRepository: MentorRepository;

    constructor(mentorsTableName: string, region?: string) {
        this.mentorRepository = new MentorRepository(mentorsTableName, region);
    }

    async createMentor(data: CreateMentorInput): Promise<Mentor> {
        if (!data.name || !data.email) {
            throw new Error('Name and email are required');
        }

        if (data.experience && data.experience < 0) {
            throw new Error('Years of experience must be positive');
        }

        return await this.mentorRepository.create(data);
    }

    async getMentor(mentorId: string): Promise<Mentor | null> {
        if (!mentorId) {
            throw new Error('Mentor ID is required');
        }
        return await this.mentorRepository.findById(mentorId);
    }

    async getAllMentors(): Promise<Mentor[]> {
        return await this.mentorRepository.findAll();
    }
}
