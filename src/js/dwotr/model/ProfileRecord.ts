import { ID } from "@/utils/UniqueIds";

class ProfileRecord {

    //id: number = 0; // autoincrement by dexie
    key: string = '';
    name: string = '';
    username: string = '';
    displayName: string | undefined;
    display_name: string | undefined;
    description: string | undefined;
    avatar: string | undefined;
    picture: string | undefined;
    cover: string | undefined;
    location: string | undefined;
    website: string | undefined;
    email: string | undefined;
    nip05: string | undefined;
    lud16: string | undefined;
    lud06: string | undefined;
    about: string | undefined;
    created_at: number = 0;
    isDefault: boolean = false;
}

export default ProfileRecord;

export class ProfileMemory extends ProfileRecord {
    id: number = 0;

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
}

//export type ProfileMemory = ProfileRecord & { id: number };