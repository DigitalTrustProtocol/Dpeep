import { ID } from "@/utils/UniqueIds";

class ProfileRecord {

    key: string = '';
    nip05: string | undefined;
}

export default ProfileRecord;

export class ProfileMemory extends ProfileRecord {
    id: number = 0;
    name: string = '';
    username: string = '';
    displayName: string | undefined;
    display_name: string | undefined;
    description: string | undefined;
    avatar: string | undefined;
    picture: string | undefined;
    banner: string | undefined;
    cover: string | undefined;
    location: string | undefined;
    website: string | undefined;
    email: string | undefined;

    lud16: string | undefined;
    lud06: string | undefined;
    about: string | undefined;
    created_at: number = 0;
    isDefault: boolean = false;

    constructor(id: number) {
        super();
        this.id = id;
    }

    static fromRecord(profile: ProfileRecord) : ProfileMemory {
        let mem = profile as ProfileMemory;
        if(mem?.id) return mem;
        let id = ID(profile.key);
        if(!mem?.id || mem.id == 0) mem.id = id;
        return mem;
    }

    static setID(profile: ProfileMemory) : ProfileMemory {
        if(!profile) return profile;
        if(!profile.id || profile.id == 0) {
            profile.id = ID(profile.key);
        }
        return profile;
    }

    static setIDs(profiles: ProfileMemory[]) : ProfileMemory[] {
        if(!profiles) return profiles;

        for(let profile of profiles) {
            if(!profile.id || profile.id == 0) {
                profile.id = ID(profile.key);
            }
        }
        return profiles;
    }
}

//export type ProfileMemory = ProfileRecord & { id: number };