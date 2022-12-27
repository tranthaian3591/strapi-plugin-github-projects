import React, { useState, useEffect } from "react";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Box,
  BaseCheckbox,
  Typography,
  Loader,
  Alert,
  Link,
  Flex,
  IconButton,
} from "@strapi/design-system";
import axios from "../utils/axiosInstance";
import { Pencil, Trash, Plus } from "@strapi/icons";
import ConfirmationDialog from "./ConfirmationDialog";
import BulkActions from "./BulkActions";
import { useIntl } from "react-intl";
import getTrad from "../utils/getTrad";

const COL_COUNT = 5;

const Repo = () => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [alert, setAlert] = useState(undefined);
  const [deletingRepo, setDeletingRepo] = useState(undefined);
  const { formatMessage } = useIntl();

  const getTranslateName = (id, defaultMessage) => {
    return formatMessage({id: getTrad(id), defaultMessage: defaultMessage});
  }

  const showAlert = (alert) => {
    setAlert(alert);
    setTimeout(() => {
      setAlert(undefined);
    }, 5000);
  };

  const showError = (error, title) => {
    let alert = {
      title: title ?? "An error occured",
      message: error.toString(),
      variant: "danger",
    };
    setAlert(alert);
    setTimeout(() => {
      setAlert(undefined);
    }, 5000);
  };

  const setResponseData = (repo, response, isAdd) => {
    const actionTitle = isAdd ? "added" : "deleted";
    setRepos(
      repos.map((item) =>
        item.id !== repo.id
          ? item
          : {
              ...item,
              projectId: isAdd ? response.data.id : null,
            }
      )
    );

    showAlert({
      title: `Project ${actionTitle}`,
      message: `Successfully ${actionTitle} project ${response.data.title}`,
      variant: "success",
    });
  };

  const deleteProject = (repo) => {
    const { projectId } = repo;
    axios
      .delete(`/github-projects/project/${projectId}`)
      .then((response) => setResponseData(repo, response, false))
      .catch((err) => showError(err));
  };

  const createProject = (repo) => {
    // designed from server/route/route.js
    axios
      .post("/github-projects/project", repo)
      .then((response) => {
        setResponseData(repo, response, true);
      })
      .catch((err) => showError(err));
  };

  const deleteAll = async (projectIds) => {
    // delete cannot add body request
    axios
      .delete("/github-projects/projects", {
        params: {
          projectIds,
        },
      })
      .then((response) => {
        setRepos(
          repos.map((repo) => {
            const releatedProjectJustDeleted = response.data.find(
              (project) => project.repositoryId == repo.id
            );
            return repo.projectId && releatedProjectJustDeleted
              ? {
                  ...repo,
                  projectId: null,
                }
              : repo;
          })
        );

        showAlert({
          title: `Projects deleted`,
          message: `Successfully deleted ${response.data.length} projects `,
          variant: "success",
        });
      })
      .catch((err) => showError(err))
      .finally(() => setSelectedRepos([]));
  };

  const createAll = (reposToBecomeProjects) => {
    axios
      .post("/github-projects/projects", {
        repos: reposToBecomeProjects,
      })
      .then((response) => {
        setRepos(
          repos.map((repo) => {
            const releatedProjectJustCreated = response.data.find(
              (project) => project.repositoryId == repo.id
            );
            return !repo.projectId && releatedProjectJustCreated
              ? {
                  ...repo,
                  projectId: releatedProjectJustCreated.id,
                }
              : repo;
          })
        );

        showAlert({
          title: `Projects created`,
          message: `Successfully created ${response.data.length} projects `,
          variant: "success",
        });
      })
      .catch((err) => showError(err))
      .finally(() => setSelectedRepos([]));
  };

  useEffect(() => {
    setLoading(true);

    // fetch data
    axios
      .get("/github-projects/repos")
      .then((response) => setRepos(response.data))
      .catch((err) => showError(err, "Error fetching repositories"));
    setLoading(false);
  }, []);

  if (loading) {
    return <Loader />;
  }

  console.log(repos);

  const allChecked = selectedRepos.length == repos.length;
  const isIndeterminate = selectedRepos.length > 0 && !allChecked; // some repos selected , but not all

  //!!deletingRepo : deletingRepo is not undifined
  return (
    <Box padding={8} background="neutral100">
      {alert && (
        <div style={{ position: "absolute", top: 0, left: "14%", zIndex: 10 }}>
          <Alert
            closeLabel="Close Alert"
            title={alert.title}
            variant={alert.variant}
          >
            {alert.message}
          </Alert>
        </div>
      )}
      {selectedRepos.length > 0 && (
        <BulkActions
          selectedRepos={selectedRepos.map((repoId) =>
            repos.find((repo) => repo.id == repoId)
          )}
          bulkCreateAction={createAll}
          bulkDeleteAction={deleteAll}
        />
      )}
      <Table colCount={COL_COUNT} rowCount={repos.length}>
        <Thead>
          <Tr>
            <Th>
              <BaseCheckbox
                aria-label="Select all entries"
                value={allChecked}
                indeterminate={isIndeterminate}
                onValueChange={(value) =>
                  value == true
                    ? setSelectedRepos(repos.map((repo) => repo.id))
                    : setSelectedRepos([])
                }
              />
            </Th>
            <Th>
              <Typography variant="sigma">{getTranslateName("repo.name", "Name")}</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">{getTranslateName("repo.description", "Description")}</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">{getTranslateName("repo.url", "Url")}</Typography>
            </Th>

            <Th>
              <Typography variant="sigma">{getTranslateName("repo.actions", "Actions")}</Typography>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {repos.map((repo) => {
            const { id, name, shortDescription, url, projectId } = repo;

            return (
              <Tr key={id}>
                <Td>
                  <BaseCheckbox
                    aria-label={`Select ${id}`}
                    value={selectedRepos.includes(id)}
                    onValueChange={(value) => {
                      const newSelectedRepos = value
                        ? [...selectedRepos, id]
                        : selectedRepos.filter((item) => item != id);
                      setSelectedRepos(newSelectedRepos);
                    }}
                  />
                </Td>
                <Td>
                  <Typography textColor="neutral800">{name}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">
                    {shortDescription}
                  </Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">
                    <Link href={url} isExternal>
                      {url}
                    </Link>
                  </Typography>
                </Td>
                <Td>
                  {projectId ? (
                    <Flex>
                      <Link
                        to={`/content-manager/collectionType/plugin::github-projects.project/${projectId}`}
                      >
                        <IconButton
                          onClick={() => console.log("edit")}
                          label="Edit"
                          noBorder
                          icon={<Pencil />}
                        />
                      </Link>
                      <Box paddingLeft={1}>
                        <IconButton
                          onClick={() => setDeletingRepo(repo)}
                          label="Delete"
                          noBorder
                          icon={<Trash />}
                        />
                      </Box>
                    </Flex>
                  ) : (
                    <Flex>
                      <IconButton
                        onClick={() => createProject(repo)}
                        label="Add"
                        noBorder
                        icon={<Plus />}
                      />
                    </Flex>
                  )}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
      {deletingRepo && (
        <ConfirmationDialog
          visible={!!deletingRepo}
          message="Are you sure you want to delete this Project?"
          onClose={() => setDeletingRepo(undefined)}
          onConfirm={() => deleteProject(deletingRepo)}
        ></ConfirmationDialog>
      )}
    </Box>
  );
};

export default Repo;
