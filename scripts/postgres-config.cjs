/** Shared operator transport policy. Docker-local databases do not require TLS. */
function postgresConfig(connectionString, env=process.env){
  const url=new URL(connectionString);
  const privateHost=['localhost','127.0.0.1','::1','[::1]','postgres','host.docker.internal'].includes(url.hostname);
  if(!privateHost){
    if(url.searchParams.get('sslmode')==='disable')throw new Error('TLS may not be disabled for public database connections');
    url.searchParams.set('sslmode','verify-full');
  }
  return {connectionString:url.toString(),connectionTimeoutMillis:5000,...(!privateHost||env.DATABASE_SSL==='true'?{ssl:{rejectUnauthorized:true}}:{})};
}
module.exports={postgresConfig};
