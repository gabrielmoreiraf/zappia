import { getCurrentClient } from "@/lib/current-client";
import { parseKnowledgeBase } from "@/lib/knowledge-base";
import { Header } from "../ui";
import { CoursesManager } from "./courses-manager";

export default async function CursosPage() {
  const client = await getCurrentClient();
  const courses = parseKnowledgeBase(client.knowledgeBase);

  return (
    <div>
      <Header
        title="Base de cursos"
        sub="É isso que a IA sabe. Adicione ou edite o que ela responde."
      />
      <CoursesManager courses={courses} />
    </div>
  );
}
