import { sha256 as hash } from "@noble/hashes/sha256";
import {bytesToHex} from '@noble/hashes/utils';

export const utf8Decoder = new TextDecoder('utf-8');
export const utf8Encoder = new TextEncoder();

export function sha256(data: string): string {
    let eventHash = hash(utf8Encoder.encode(data));
    return bytesToHex(eventHash);
  }

export function getNostrTime(date: number = Date.now()) : number {
    return Math.floor(date / 1000);
}

export function toNostrUTCstring(nostrTime: number = Date.now()) : string {
    return new Date(nostrTime*1000).toUTCString();
}

export function hexName(hexPub: string) {
  return hexPub.slice(0, 4) + '...' + hexPub.slice(-4);	
}
