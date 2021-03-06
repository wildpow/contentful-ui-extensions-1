import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, Select, Option } from '@contentful/forma-36-react-components';
import '@contentful/forma-36-react-components/dist/styles.css';
import './ContentDiff.scss';
import { addEditorInterface, addEntry, addEntrySnapshots, createSimpleObjects, resetLookups } from './helpers';
import { firstIndex } from './constants';

const getLoading = () => {
  return (
    <div className="loading-message">
      <p>Loading...</p>
    </div>
  );
};

const getError = (message) => {
  return (
    <div className="error-message">
      <p>{message}</p>
    </div>
  );
};

export const ContentDiffSidebar = ({ sdk }) => {
  const [versions, setVersions] = useState([]);
  const [version, setVersion] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    sdk.window.startAutoResizer();
    sdk.space.getEntrySnapshots(sdk.ids.entry).then((snapshots) => {
      setVersions(snapshots.items);
      setLoaded(true);
    });
  }, [sdk]);

  const refresh = () => {
    resetLookups();
    setLoaded(false);
    sdk.space.getEntrySnapshots(sdk.ids.entry).then((snapshots) => {
      setVersions(snapshots.items);
      setLoaded(true);
    });
  };

  const onButtonClick = async () => {
    addEntrySnapshots(sdk.ids.entry, versions);
    addEntry(sdk.ids.entry, sdk.entry);
    const entry = (version.snapshot && version) || versions[0];
    setVersion(entry);

    const controls = sdk.editor.editorInterface.controls.filter(({ field }) => !field.disabled);
    addEditorInterface(sdk.ids.entry, controls);

    const currentFields = await createSimpleObjects(sdk.space, controls, sdk.entry.fields);
    const oldFields = await createSimpleObjects(sdk.space, controls, entry.snapshot.fields, 'en-US');

    await sdk.dialogs.openExtension({
      width: 'fullWidth',
      title: 'Last Rev - Content Diff',
      allowHeightOverflow: true,
      parameters: {
        controls,
        currentFields,
        oldFields,
        snapshotUpdatedAt: entry.sys.updatedAt,
      },
    });
  };

  const selectVersion = (event) => {
    setVersion(versions.filter((v) => v.sys.id === event.currentTarget.value)[firstIndex]);
  };

  const getOptions = (options) => {
    return options.length > 0
      ? options.map((option) => {
          const updatedAt = new Date(option.sys.updatedAt);
          return (
            <Option key={option.sys.id} testId={`cf-ui-select-option-${option.sys.id}`} value={option.sys.id}>
              {updatedAt.toLocaleDateString('en-us', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              &nbsp;
              {updatedAt.toLocaleTimeString('en-us', { hour: '2-digit', minute: '2-digit' })}
            </Option>
          );
        })
      : [<Option />];
  };

  const getDropdownAndButton = () => {
    return (
      <div>
        <Select
          className=""
          id="versionSelect"
          name="versionSelect"
          onChange={(e) => selectVersion(e)}
          testId="cf-ui-select-version"
          width="full"
          willBlurOnEsc>
          {getOptions(versions)}
        </Select>
        <Button buttonType="positive" isFullWidth testId="view-changes-button" onClick={onButtonClick}>
          View Changes
        </Button>
        <Button buttonType="muted" isFullWidth testId="refresh-button" onClick={refresh}>
          Refresh
        </Button>
      </div>
    );
  };

  const getLoadedInfo = () => {
    return versions.length > 0 ? getDropdownAndButton() : getError('No past versions to diff.');
  };

  return loaded ? getLoadedInfo() : getLoading();
};

ContentDiffSidebar.propTypes = {
  sdk: PropTypes.shape({
    window: PropTypes.shape({
      startAutoResizer: PropTypes.func.isRequired,
    }),
    space: PropTypes.shape({
      getEntrySnapshots: PropTypes.func.isRequired,
    }),
    ids: PropTypes.shape({
      entry: PropTypes.string.isRequired,
    }),
    dialogs: PropTypes.shape({
      openExtension: PropTypes.func.isRequired,
    }),
    entry: PropTypes.shape({
      fields: PropTypes.object.isRequired,
    }),
    editor: PropTypes.shape({
      editorInterface: PropTypes.shape({
        controls: PropTypes.array.isRequired,
      }),
    }),
  }).isRequired,
};

export default ContentDiffSidebar;

/**
 * By default, iframe of the extension is fully reloaded on every save of a source file.
 * If you want to use HMR (hot module reload) instead of full reload, uncomment the following lines
 */
// if (module.hot) {
//   module.hot.accept();
// }
