import base64url from "base64url";

export function createId(id) {
    console.log(id);
    if(!id) return undefined;
    return base64url(JSON.stringify(id));
}

export function parseId(id) {
    if(!id) return undefined;
    console.log(id);
    console.log(base64url.decode(id))
    return JSON.parse(base64url.decode(id));
}