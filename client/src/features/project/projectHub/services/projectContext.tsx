import { createContext, useState, useEffect, useContext } from "react";
import { fetchProjectContext, type ProjectContextData } from "./projects.services";
import { useUser } from "@/core/auth/userContext";

interface ProjectContextValue {
    project: ProjectContextData | null;
    loading: boolean;
    isAdmin: boolean;
    error: string | null;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ projectId, children }: {projectId: number, children: React.ReactNode }) {
    const {user, loading: userLoading } = useUser(); 
    const [project, setProject] = useState<ProjectContextData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = !!user && (user.idRolGlobal === 1 || user.idRolGlobal === 2);

    useEffect(() => {
        if (userLoading || !user) return;

        let isMounted = true;

        const load = async () => {
            setLoading(true);
            setProject(null);
            setError(null);
            try {
                const data = await fetchProjectContext(projectId);
                if (isMounted) setProject(data);
            } catch (err) {
                if (isMounted) setError((err as Error).message);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        void load();

        return () => { isMounted = false; };
    }, [projectId, user, userLoading]);

    return (
        <ProjectContext.Provider value={{ project, loading, isAdmin, error }}>
            {children}
        </ProjectContext.Provider>
    );

}

// eslint-disable-next-line react-refresh/only-export-components
export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject debe de usarse dentro de ProjectProvider');
  return context;
}