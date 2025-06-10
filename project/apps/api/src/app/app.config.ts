export enum ApplicationServiceURL {
  Users = 'http://localhost:3001/api/auth',
  Posts = 'http://localhost:3002/api/posts',
  Comments = 'http://localhost:3002/api/comments',
  Feed = 'http://localhost:3002/api/feed',
  Files = 'http://localhost:3004/api/files',
  FilesStatic = 'http://localhost:3004/static',
}

export const HttpClient = {
  MaxRedirects: 5,
  Timeout: 3000,
} as const;
