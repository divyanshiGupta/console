import * as React from 'react';
import { match } from 'react-router-dom';
import * as _ from 'lodash-es';

import { getBadgeFromType } from '@console/shared';
import {
  useExtensions,
  ResourceTabPage,
  isResourceTabPage,
  isDetailPageBreadCrumbs,
  DetailPageBreadCrumbs,
} from '@console/plugin-sdk';
import { ResolvedExtension, useResolvedExtensions } from '@console/dynamic-plugin-sdk';
import { withFallback } from '@console/shared/src/components/error/error-boundary';
import {
  Firehose,
  HorizontalNav,
  PageHeading,
  FirehoseResource,
  KebabOptionsCreator,
  Page,
  AsyncComponent,
  PageComponentProps,
} from '../utils';
import {
  K8sResourceKindReference,
  K8sResourceKind,
  K8sKind,
  referenceForModel,
  referenceFor,
} from '../../module/k8s';
import { Alert, Rule } from '../monitoring/types';
import { ErrorBoundaryFallback } from '../error';
import { breadcrumbsForDetailsPage } from '../utils/breadcrumbs';
import DetailsBreadcrumbResolver from './details-breadcrumb-resolver';
import { useK8sModel } from '@console/shared/src/hooks/useK8sModel';

const useBreadCrumbsForDetailPage = (
  kindObj: K8sKind,
): ResolvedExtension<DetailPageBreadCrumbs> => {
  const [breadCrumbsExtension, breadCrumbsResolved] = useResolvedExtensions<DetailPageBreadCrumbs>(
    isDetailPageBreadCrumbs,
  );
  return React.useMemo(
    () =>
      breadCrumbsResolved
        ? breadCrumbsExtension.find(({ properties: { getModels } }) => {
            const models = getModels();
            return Array.isArray(models)
              ? models.findIndex((model: K8sKind) => model.kind === kindObj?.kind) !== -1
              : models.kind === kindObj?.kind;
          })
        : undefined,
    [breadCrumbsResolved, breadCrumbsExtension, kindObj],
  );
};

export const DetailsPage = withFallback<DetailsPageProps>(({ pages = [], ...props }) => {
  const resourceKeys = _.map(props.resources, 'prop');
  const [pluginBreadcrumbs, setPluginBreadcrumbs] = React.useState(undefined);
  const [model] = useK8sModel(props.kind);
  const kindObj = props.kindObj ?? model;
  const renderAsyncComponent = (page: ResourceTabPage, cProps: PageComponentProps) => (
    <AsyncComponent loader={page.properties.loader} {...cProps} />
  );

  const resourcePageExtensions = useExtensions<ResourceTabPage>(isResourceTabPage);

  const pluginPages = React.useMemo(
    () =>
      resourcePageExtensions
        .filter(
          (p) =>
            referenceForModel(p.properties.model) ===
            (props.kindObj ? referenceFor(props.kindObj) : props.kind),
        )
        .map((p) => ({
          href: p.properties.href,
          name: p.properties.name,
          component: (cProps) => renderAsyncComponent(p, cProps),
        })),
    [resourcePageExtensions, props],
  );
  const resolvedBreadcrumbExtension = useBreadCrumbsForDetailPage(kindObj);
  const onBreadcrumbsResolved = React.useCallback((breadcrumbs) => {
    setPluginBreadcrumbs(breadcrumbs || undefined);
  }, []);
  let allPages = [...pages, ...pluginPages];
  allPages = allPages.length ? allPages : null;

  return (
    <>
      {resolvedBreadcrumbExtension && (
        <DetailsBreadcrumbResolver
          useBreadcrumbs={resolvedBreadcrumbExtension.properties.breadcrumbsProvider}
          onBreadcrumbsResolved={onBreadcrumbsResolved}
          urlMatch={props.match}
          kind={kindObj}
        />
      )}
      <Firehose
        resources={[
          {
            kind: props.kind,
            kindObj: props.kindObj,
            name: props.name,
            namespace: props.namespace,
            isList: false,
            prop: 'obj',
          } as FirehoseResource,
        ].concat(props.resources || [])}
      >
        <PageHeading
          detail={true}
          title={props.title || props.name}
          titleFunc={props.titleFunc}
          menuActions={props.menuActions}
          buttonActions={props.buttonActions}
          kind={props.customKind || props.kind}
          breadcrumbs={pluginBreadcrumbs}
          breadcrumbsFor={
            props.breadcrumbsFor ??
            (!pluginBreadcrumbs ? breadcrumbsForDetailsPage(props.kindObj, props.match) : undefined)
          }
          resourceKeys={resourceKeys}
          getResourceStatus={props.getResourceStatus}
          customData={props.customData}
          badge={props.badge || getBadgeFromType(props.kindObj && props.kindObj.badge)}
          icon={props.icon}
          ele={props.ele}
        >
          {props.children}
        </PageHeading>
        <HorizontalNav
          alert={props.alert}
          loaded={props.loaded}
          loadError={props.loadError}
          rule={props.rule}
          silencesLoaded={props.silencesLoaded}
          namespace={props.namespace}
          name={props.name}
          pages={allPages}
          pagesFor={props.pagesFor}
          className={`co-m-${_.get(props.kind, 'kind', props.kind)}`}
          match={props.match}
          label={props.label || (props.kind as any).label}
          resourceKeys={resourceKeys}
          customData={props.customData}
        />
      </Firehose>
    </>
  );
}, ErrorBoundaryFallback);

export type DetailsPageProps = {
  match: match<any>;
  title?: string | JSX.Element;
  titleFunc?: (obj: K8sResourceKind) => string | JSX.Element;
  menuActions?: Function[] | KebabOptionsCreator; // FIXME should be "KebabAction[] |" refactor pipeline-actions.tsx, etc.
  buttonActions?: any[];
  pages?: Page[];
  pagesFor?: (obj: K8sResourceKind) => Page[];
  kind: K8sResourceKindReference;
  kindObj?: K8sKind;
  label?: string;
  name?: string;
  namespace?: string;
  resources?: FirehoseResource[];
  breadcrumbsFor?: (obj: K8sResourceKind) => { name: string; path: string }[];
  customData?: any;
  badge?: React.ReactNode;
  icon?: React.ComponentType<{ obj: K8sResourceKind }>;
  getResourceStatus?: (resource: K8sResourceKind) => string;
  children?: React.ReactNode;
  customKind?: string;
  alert?: Alert;
  loaded?: any;
  loadError?: string;
  rule?: Rule;
  silencesLoaded?: boolean;
  ele?: JSX.Element;
};

DetailsPage.displayName = 'DetailsPage';
