export interface IPartner {
    _id: string;
    name: string;
    partnerId: string;
    partnerSecret: string;
    allowedTags: string[];
    status: 'active' | 'inactive';
    createdAt: Date;
    _updatedAt?: Date;
}