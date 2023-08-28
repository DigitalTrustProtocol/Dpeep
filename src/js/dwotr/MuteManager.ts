import { ID, UID } from '@/utils/UniqueIds';
import { Vertice } from './model/Graph';
import SocialNetwork from '@/nostr/SocialNetwork';

class MuteManager {
  mutes = new Set<UID>(); // Mutes that are aggregated from multiple profiles

  add(mutes: string[] | Set<string> | undefined): void {
    // Load the mutes from the profiles
    if (!mutes) return;
    for (const p of mutes) {
      this.mutes.add(ID(p));
    }
  }

  remove(mutes: string[] | Set<string> | undefined): void {
    // remove the mutes from the profiles
    if (!mutes) return;
    for (const p of mutes) {
      this.mutes.delete(ID(p));
    }
  }

  addProfileMutes(id: UID) {
    // Add the mutes from the profile
    let profile = SocialNetwork.profiles.get(id);
    if (!profile) return;
    this.add(profile.mutes);
  }

  removeProfileMutes(id: UID) {
    // Remove the mutes from the profile
    let profile = SocialNetwork.profiles.get(id);
    if (!profile) return;
    this.remove(profile.mutes);
  }

  // Process the aggregated mutes based on the vertices changed.
  // The add or remove mutes based on Profile.mutes
  // This is a state change function, it will change the state of the mutes
  processChange(vertices: Array<Vertice>) {
    if (!vertices || vertices.length == 0) return;

    for (const v of vertices) {
      if (!v) continue;

      if (v.oldScore) {
        if (v.oldScore.trusted() && !v.score.trusted()) this.removeProfileMutes(v.id); // If old true and new false then remove
        if (!v.oldScore.trusted() && v.score.trusted()) this.addProfileMutes(v.id); // If old false and new true then add

        // if (v.oldScore.trusted() && v.score.trusted()) continue;// If old true and new true then no change
        // if (!v.oldScore.trusted() && !v.score.trusted()) continue;// If old false and new false then no change

        continue;
      }

      if (v.score.trusted()) this.addProfileMutes(v.id); // If old undefined and new true then add

      //if (!v.score.trusted()) continue;// If old undefined and new false then no change
    }
  }
}

const muteManager = new MuteManager();
export default muteManager;
