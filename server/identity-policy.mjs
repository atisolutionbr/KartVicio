export function googleEmail(payload) {
 const email=typeof payload.email==='string'?payload.email.trim().toLowerCase():'';
 if(payload.email_verified!==true || !email || !(/@gmail\.com$/.test(email)||payload.hd))throw Error('not_allowed');
 return email;
}
export function resolveIdentity(name,payload,identity) {
 // A previous browser session must never decide the identity of a Google login.
 if(name==='google')return googleEmail(payload);
 if(!identity)throw Error('link_required');
 return identity.email;
}
