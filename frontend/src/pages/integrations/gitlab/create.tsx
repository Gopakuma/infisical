import { useEffect, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { faArrowUpRightFromSquare, faBookOpen, faBugs, faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import queryString from "query-string";

import {
  useCreateIntegration
} from "@app/hooks/api";

import {
  Button,
  Card,
  CardTitle,
  FormControl,
  Input,
  Select,
  SelectItem
} from "../../../components/v2";
import {
  useGetIntegrationAuthApps,
  useGetIntegrationAuthById,
  useGetIntegrationAuthTeams
} from "../../../hooks/api/integrationAuth";
import { useGetWorkspaceById } from "../../../hooks/api/workspace";

const gitLabEntities = [
  { name: "Individual", value: "individual" },
  { name: "Group", value: "group" }
];

export default function GitLabCreateIntegrationPage() {
  const router = useRouter();
  const { mutateAsync } = useCreateIntegration();

  const { integrationAuthId } = queryString.parse(router.asPath.split("?")[1]);

  const { data: workspace } = useGetWorkspaceById(localStorage.getItem("projectData.id") ?? "");
  const { data: integrationAuth } = useGetIntegrationAuthById((integrationAuthId as string) ?? "");

  const [targetTeamId, setTargetTeamId] = useState<string | null>(null);

  const { data: integrationAuthApps, isLoading: isintegrationAuthAppsLoading } = useGetIntegrationAuthApps({
    integrationAuthId: (integrationAuthId as string) ?? "",
    ...(targetTeamId ? { teamId: targetTeamId } : {})
  });
  const { data: integrationAuthTeams, isLoading: isintegrationAuthTeamsLoading } = useGetIntegrationAuthTeams(
    (integrationAuthId as string) ?? ""
  );

  const [targetEntity, setTargetEntity] = useState(gitLabEntities[0].value);
  const [selectedSourceEnvironment, setSelectedSourceEnvironment] = useState("");
  const [secretPath, setSecretPath] = useState("/");
  const [targetAppId, setTargetAppId] = useState("");
  const [targetEnvironment, setTargetEnvironment] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (workspace) {
      setSelectedSourceEnvironment(workspace.environments[0].slug);
    }
  }, [workspace]);

  useEffect(() => {
    if (integrationAuthApps) {
      if (integrationAuthApps.length > 0) {
        setTargetAppId(integrationAuthApps[0].appId as string);
      } else {
        setTargetAppId("none");
      }
    }
  }, [integrationAuthApps]);

  useEffect(() => {
    if (targetEntity === "group" && integrationAuthTeams && integrationAuthTeams.length > 0) {
      if (integrationAuthTeams) {
        if (integrationAuthTeams.length > 0) {
          // case: user is part of at least 1 group in GitLab
          setTargetTeamId(integrationAuthTeams[0].teamId);
        } else {
          // case: user is not part of any groups in GitLab
          setTargetTeamId("none");
        }
      }
    } else if (targetEntity === "individual") {
      setTargetTeamId(null);
    }
  }, [targetEntity, integrationAuthTeams]);

  const handleButtonClick = async () => {
    try {
      setIsLoading(true);
      if (!integrationAuth?._id) return;

      await mutateAsync({
        integrationAuthId: integrationAuth?._id,
        isActive: true,
        app: integrationAuthApps?.find((integrationAuthApp) => integrationAuthApp.appId === targetAppId)?.name,
        appId: String(targetAppId),
        sourceEnvironment: selectedSourceEnvironment,
        targetEnvironment: targetEnvironment === "" ? "*" : targetEnvironment,
        secretPath
      });

      setIsLoading(false);
      router.push(`/integrations/${localStorage.getItem("projectData.id")}`);
    } catch (err) {
      console.error(err);
    }
  };

  return integrationAuth &&
    workspace &&
    selectedSourceEnvironment &&
    integrationAuthApps &&
    integrationAuthTeams &&
    targetAppId ? (
    <div className="flex flex-col h-full w-full items-center justify-center">
      <Head>
        <title>Set Up GitLab Integration</title>
        <link rel='icon' href='/infisical.ico' />
      </Head>
      <Card className="max-w-lg rounded-md border border-mineshaft-600">
        <CardTitle 
          className="text-left px-6 text-xl" 
          subTitle="Select which environment or folder in Infisical you want to sync to GitLab's environment variables."
        >
          <div className="flex flex-row items-center">
            <div className="inline flex items-center pb-0.5">
              <Image
                src="/images/integrations/Gitlab.png"
                height={28}
                width={28}
                alt="Gitlab logo"
              />
            </div>
            <span className="ml-2.5">GitLab Integration </span>
            <Link href="https://infisical.com/docs/integrations/cicd/gitlab" passHref>
              <a target="_blank" rel="noopener noreferrer">
                <div className="ml-2 mb-1 rounded-md text-yellow text-sm inline-block bg-yellow/20 px-1.5 pb-[0.03rem] pt-[0.04rem] opacity-80 hover:opacity-100 cursor-default">
                  <FontAwesomeIcon icon={faBookOpen} className="mr-1.5"/> 
                  Docs
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="ml-1.5 text-xxs mb-[0.07rem]"/> 
                </div>
              </a>
            </Link>
          </div>
        </CardTitle>
        <FormControl label="Project Environment" className="px-6">
          <Select
            value={selectedSourceEnvironment}
            onValueChange={(val) => setSelectedSourceEnvironment(val)}
            className="w-full border border-mineshaft-500"
          >
            {workspace?.environments.map((sourceEnvironment) => (
              <SelectItem
                value={sourceEnvironment.slug}
                key={`source-environment-${sourceEnvironment.slug}`}
              >
                {sourceEnvironment.name}
              </SelectItem>
            ))}
          </Select>
        </FormControl>
        <FormControl label="Secrets Path" className="px-6">
          <Input
            value={secretPath}
            onChange={(evt) => setSecretPath(evt.target.value)}
            placeholder="Provide a path, default is /"
          />
        </FormControl>
        <FormControl label="GitLab Integration Type" className="px-6">
          <Select
            value={targetEntity}
            onValueChange={(val) => setTargetEntity(val)}
            className="w-full border border-mineshaft-500"
          >
            {gitLabEntities.map((entity) => {
              return (
                <SelectItem value={entity.value} key={`target-entity-${entity.value}`}>
                  {entity.name}
                </SelectItem>
              );
            })}
          </Select>
        </FormControl>
        {targetEntity === "group" && targetTeamId && (
          <FormControl label="GitLab Group" className="px-6">
            <Select
              value={targetTeamId}
              onValueChange={(val) => setTargetTeamId(val)}
              className="w-full border border-mineshaft-500"
            >
              {integrationAuthTeams.length > 0 ? (
                integrationAuthTeams.map((integrationAuthTeam) => (
                  <SelectItem
                    value={integrationAuthTeam.teamId}
                    key={`target-team-${integrationAuthTeam.teamId}`}
                  >
                    {integrationAuthTeam.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" key="target-team-none">
                  No groups found
                </SelectItem>
              )}
            </Select>
          </FormControl>
        )}
        <FormControl label="GitLab Project" className="px-6">
          <Select
            value={targetAppId}
            onValueChange={(val) => setTargetAppId(val)}
            className="w-full border border-mineshaft-500"
            isDisabled={integrationAuthApps.length === 0}
          >
            {integrationAuthApps.length > 0 ? (
              integrationAuthApps.map((integrationAuthApp) => (
                <SelectItem
                  value={integrationAuthApp.appId as string}
                  key={`target-app-${integrationAuthApp.appId}`}
                >
                  {integrationAuthApp.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" key="target-app-none">
                No projects found
              </SelectItem>
            )}
          </Select>
        </FormControl>
        <FormControl label="GitLab Environment Scope (Optional)" className="px-6">
          <Input
            placeholder="*"
            value={targetEnvironment}
            onChange={(e) => setTargetEnvironment(e.target.value)}
          />
        </FormControl>
        <Button
          onClick={handleButtonClick}
          colorSchema="primary"
          variant="outline_bg"
          className="mb-6 mt-2 ml-auto mr-6 w-min"
          isLoading={isLoading}
          isDisabled={integrationAuthApps.length === 0}
        >
          Create Integration
        </Button>
      </Card>
      <div className="border-t border-mineshaft-800 w-full max-w-md mt-6"/>
      <div className="flex flex-col bg-mineshaft-800 border border-mineshaft-600 w-full p-4 max-w-lg mt-6 rounded-md">
        <div className="flex flex-row items-center"><FontAwesomeIcon icon={faCircleInfo} className="text-mineshaft-200 text-xl"/> <span className="ml-3 text-md text-mineshaft-100">Pro Tips</span></div>
        <span className="text-mineshaft-300 text-sm mt-4">After creating an integration, your secrets will start syncing immediately. This might cause an unexpected override of current secrets in GitLab with secrets from Infisical.</span>
      </div>
    </div>
  ) : (
    <div className="flex justify-center items-center w-full h-full">
      <Head>
        <title>Set Up GitLab Integration</title>
        <link rel='icon' href='/infisical.ico' />
      </Head>
      {isintegrationAuthAppsLoading || isintegrationAuthTeamsLoading ? <img src="/images/loading/loading.gif" height={70} width={120} alt="infisical loading indicator" /> : <div className="max-w-md h-max p-6 border border-mineshaft-600 rounded-md bg-mineshaft-800 text-mineshaft-200 flex flex-col text-center">
        <FontAwesomeIcon icon={faBugs} className="text-6xl my-2 inlineli"/>
        <p>
          Something went wrong. Please contact <a
            className="inline underline underline-offset-4 decoration-primary-500 opacity-80 hover:opacity-100 text-mineshaft-100 duration-200 cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
            href="mailto:support@infisical.com"
          >
            support@infisical.com
          </a> if the issue persists.
        </p>
      </div>}
    </div>
  );
}

GitLabCreateIntegrationPage.requireAuth = true;
