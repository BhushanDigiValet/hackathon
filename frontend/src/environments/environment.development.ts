export const environment = {
  production: false,
  // Proxied to the NestJS server by proxy.conf.json during `ng serve`.
  graphqlUri: '/graphql',
  // Proxied to the REST API (10.81.3.135:3000) by proxy.conf.json during `ng serve`.
  apiBaseUrl: '/api',};
