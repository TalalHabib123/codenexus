interface CreateProject {
    title: string;
    description: string;
}


type ExpressResponseType = {
    status: string;
    message: string;
    data?: Record<string, any> | null;
    error?: Record<string, any> | null;
  };

  
export type { 
    CreateProject, 
    ExpressResponseType 

};