// Trusted operator identities only, never customer text or arbitrary SQL.
// Plain constants let PostgreSQL use existing identity indexes. Runtime
// convert_from/decode expressions can prevent those index conditions.
export function operatorIdentityLiteral(value) {
 if(typeof value!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value))throw Error('INVALID_OPERATOR_IDENTITY');
 return "'"+value+"'";
}
