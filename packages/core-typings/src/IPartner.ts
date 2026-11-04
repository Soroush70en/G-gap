export interface IPartnerPublicKey {
    kid: string;
    pem: string;
    status: 'active' | 'retired';
    createdAt?: Date;
}

export interface IPartner {
    _id: string;
    name: string;
    partnerId: string;
    partnerSecret: string;
    allowedTags: string[];
    status: 'active' | 'inactive';
    // Public keys that verify the partner's login assertions (JWT, ES256). Looked up by the JWT `kid`.
    publicKeys?: IPartnerPublicKey[];
    createdAt: Date;
    _updatedAt?: Date;
}
