export interface GetTokenRequest {
  grant_type: "password";
  client_id: "app-cli";
  username: string;
  password: string;
}
