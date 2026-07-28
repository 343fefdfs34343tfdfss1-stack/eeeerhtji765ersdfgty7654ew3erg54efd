import { Octokit } from "@octokit/rest";
import { config } from "./config.js";

const github = new Octokit({ auth: config.GITHUB_TOKEN });
const repository = { owner: config.GITHUB_OWNER, repo: config.GITHUB_REPO };

function isConflict(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error &&
    (error as { status?: number }).status === 409;
}

export async function setTrackedTarget(target: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data } = await github.repos.getContent({
      ...repository,
      path: config.TRACKING_FILE,
      ref: config.GITHUB_BRANCH
    });

    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
      throw new Error(`Tracking path '${config.TRACKING_FILE}' is not a text file.`);
    }

    try {
      await github.repos.createOrUpdateFileContents({
        ...repository,
        path: config.TRACKING_FILE,
        branch: config.GITHUB_BRANCH,
        sha: data.sha,
        message: `Set Discord target ${target}`,
        content: Buffer.from(target, "utf8").toString("base64"),
        committer: {
          name: "Discord GitHub Bot",
          email: "discord-github-bot@users.noreply.github.com"
        }
      });

      return;
    } catch (error) {
      if (!isConflict(error) || attempt === 2) throw error;
    }
  }

  throw new Error("GitHub update conflicted too many times.");
}
