import { toastr } from 'react-redux-toastr';
import { POLL_TIMEOUT } from 'apiConfig';
import PipeLinesApi from 'apis/PipelinesApi';
import commitsApi from 'apis/CommitsApi';
import { getCurrentUserInformation } from './dataParserHelpers';

export const callToCommitApi = (
  projectId,
  branch,
  action,
  finalContent,
) => commitsApi.performCommit(
  projectId,
  '.mlreef.yml',
  finalContent,
  branch,
  'Stage branch for pipeline execution via API [skip ci]',
  action,
)
  .then((commit) => {
    const userInfo = getCurrentUserInformation();
    const dataPipelinePayload = {
      variables: [
        { key: 'GIT_PUSH_TOKEN', variable_type: 'env_var', value: userInfo.token },
        { key: 'GIT_PUSH_USER', variable_type: 'env_var', value: userInfo.userName },
        { key: 'GIT_USER_EMAIL', variable_type: 'env_var', value: userInfo.userEmail },
      ],
    };
    PipeLinesApi
      .create(commit.project_id, branch, dataPipelinePayload)
      .then(() => toastr.success('Success', 'Pipeline was generated'))
      .catch(() => toastr.error('Error', 'Pipeline creation failed'));
  })
  .catch((err) => err);

export const getFileDifferences = async (projectId, diff, previousCommitId, lastCommitId) => {
  let previousVersionFile;
  let nextVersionFile;
  if (!diff.new_file) {
    previousVersionFile = await commitsApi.getFileDataInCertainCommit(
      projectId,
      encodeURIComponent(
        diff.old_path,
      ), previousCommitId,
    );
  }
  if (!diff.deleted_file) {
    nextVersionFile = await commitsApi.getFileDataInCertainCommit(
      projectId,
      encodeURIComponent(
        diff.old_path,
      ), lastCommitId,
    );
  }

  return { previousVersionFile, nextVersionFile };
};

/**
 * Suscribe to a real time (polling) communication.
 *
 * @param {Object} options
 * @param {Number[integer]} options.timeout interval in milliseconds (default 1000).
 * @param {Function} action the function to be called.
 * @param {any} args the parameter for the function.
 *
 * @return {Function} the unsuscribe function.
 */
export const suscribeRT = (options = {}) => (action, args) => {
  const {
    timeout,
  } = options;

  let timeoutId = null;

  const executeTimedAction = () => {
    action(args);

    timeoutId = setTimeout(executeTimedAction, timeout || POLL_TIMEOUT);
  };

  executeTimedAction();

  return () => {
    clearTimeout(timeoutId);
  };
};
