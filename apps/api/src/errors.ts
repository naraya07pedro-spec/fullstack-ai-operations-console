export class AppError extends Error {constructor(public statusCode:number,public code:string, message:string){super(message);}}
export const notFound=()=>new AppError(404,'NOT_FOUND','Resource not found');
