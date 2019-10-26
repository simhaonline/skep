import Task from './task';
import Environment from './environment';
import Mounts from './mounts';
import Messages from './messages';

import * as Icon from 'react-feather';

class Service extends React.Component {
  constructor(props) {
    super(props);
    this.state = { highlight: false };
  }

  highlight(highlight, className) {
    this.setState({ highlight: highlight, highlightClass: className });
  }

  replicas() {
    const { replicas } = this.props.service;
    const { dashboard } = this.props.stack;

    if (replicas !== null) return replicas;

    // Global service
    return Skep.dashboard.nodes().length;
  }

  imageMismatch() {
    const { image } = this.props.service;

    return this.tasks().some(
      task => task.image && image ? task.image.digest !== image.digest : false
    );
  }

  unknownDigest() {
    const { image } = this.props.service;

    if (image && image.digest) return false;

    return true;
  }

  shortDigest() {
    const { image } = this.props.service;

    if (image && image.digest) {
      return image.digest.substring(0, 16);
    }

    return '[unknown]';
  }

  stateIconWarning(message) {
    return (
      <span
        title={message}
        className={'service-icon text-warning update-warning'}
        data-toggle={'tooltip'}
        data-html={'true'}
        data-original-title={message}>
        <Icon.AlertTriangle className={'icon'} />
      </span>
    );
  }

  stateIconUpdating(message) {
    return (
      <span
        title={message}
        data-original-title={message}
        className={'service-icon updating'}
        data-html={'true'}
        data-toggle={'tooltip'}>
        <Icon.RefreshCw className={'icon'} />
      </span>
    );
  }

  stateIconPaused(renderMessage) {
    const { stateMessage } = this.props.service;
    const message = renderMessage(stateMessage);
    return (
      <span
        title={message}
        className={'service-icon text-danger'}
        data-toggle={'tooltip'}
        data-html={'true'}
        data-original-title={message}>
        <Icon.PauseCircle className={'icon'} />
      </span>
    );
  }

  stateIconError(renderMessage) {
    const { state } = this.props.service;
    const message = renderMessage(state);
    return (
      <span
        title={message}
        className={'service-icon text-danger'}
        data-toggle={'tooltip'}
        data-html={'true'}
        data-original-title={message}>
        <Icon.AlertOctagon className={'icon'} />
      </span>
    );
  }

  stateIconComplete(renderMessage) {
    const { updated } = this.props.service;
    const message = renderMessage(moment(updated).fromNow(), this.shortDigest());

    return (
      <span
        title={message}
        className={'service-icon text-success'}
        data-toggle={'tooltip'}
        data-html={'true'}
        data-original-title={message}>
        <Icon.CheckCircle className={'icon'} />
      </span>
    );
  }

  stateIcon(type, messageDescriptor) {
    const message = Messages.service.state[messageDescriptor];
    switch (type) {
      case 'updating': return this.stateIconUpdating(message);
      case 'paused': return this.stateIconPaused(message);
      case 'warning': return this.stateIconWarning(message);
      case 'success': return this.stateIconComplete(message);
      case 'error': return this.stateIconError(message);
    }
  }

  updateStatus() {
    const { updated, image, state } = this.props.service;
    const messages = Messages.service.state;

    if (this.imageMismatch()) return this.stateIcon('warning', 'inconsistentImages');
    if (this.unknownDigest()) return this.stateIcon('warning', 'unknownDigest');

    switch (state) {
      case 'rollback_started': return this.stateIcon('updating', 'rollbackStarted');
      case 'rollback_paused': return this.stateIcon('paused', 'rollbackPaused');
      case 'rollback_completed': return this.stateIcon('success', 'rollbackComplete');
      case 'started': return this.stateIcon('updating', 'updateStarted');
      case 'paused': return this.stateIcon('paused', 'updatePaused');
      case 'completed': return this.stateIcon('success', 'updateComplete');
    }

    return this.stateIcon(this.stateIcon('error', 'unrecognized'));
  }

  renderPortsExpanded() {
    const { ports, id } = this.props.service;

    return ports.map(
      mapping => (
        <div
          key={`service-${id}-${mapping.published}-${mapping.target}`}
          className={'ports'}>
          <span
            data-toggle={'tooltip'}
            title={'Published Port'}
            className={'published port'}>
            {':'}
            {mapping.published}
          </span>
          <span className={'published arrow'}>
            &#8613;
          </span>
          <span
            data-toggle={'tooltip'}
            title={'Target Port'}
            className={'target port'}>
            {':'}
            {mapping.target}
          </span>
          <span className={'target arrow'}>
            &#8615;
          </span>
        </div>
      )
    );
  }

  runningCount() {
    const { tasks } = this.props.service;
    return tasks.filter(task => task.state === 'running').length;
  }

  level() {
    const { tasks } = this.props.service;
    const running = this.runningCount();
    const total = this.replicas();

    switch (running) {
      case 0:
        return 'danger'
      case total:
        return 'success'
      default:
        return 'warning'
    }
  }

  statusSymbol() {
    switch (this.level()) {
      case 'danger':
        return '';
      case 'success':
        return '✓';
      case 'warning':
        return '✗';
    }
  }

  countBadge() {
    const { tasks } = this.props.service;
    const tooltip = `<em>${this.runningCount()} / ${this.replicas()}</em> replicas running <em>${this.statusSymbol()}</em>`;

    return (
      <span
        className={`badge bg-${this.level()}`}
        title={tooltip}
        data-html={'true'}
        data-original-title={tooltip}
        data-toggle={'tooltip'}>
        {this.runningCount()}
      </span>
    );
  }

  renderPortsCollapsed() {
    const { service } = this.props;

    return service.ports.map((mapping, idx) => (
      <span
        className={'ports'}
        key={`ports-${service.name}-${mapping.published}-${mapping.target}`}>
        <span
          data-toggle={'tooltip'}
          title={'Published Port'}
          className={'published'}>
          {mapping.published}
        </span>
        <span className={'punctuation'}>
          {':'}
        </span>
        <span
          data-toggle={'tooltip'}
          title={'Target Port'}
          className={'target'}>{mapping.target}</span>
        {idx + 1 < service.ports.length ? <br /> : null}
      </span>
      )
    );
  }

  highlightRelated(highlight) {
    this.highlightNodes(highlight);
    this.highlightNetworkedServices(highlight);
    this.highlight(highlight, 'selected');

    return false;
  }

  highlightNodes(highlight) {
    const $nodes = $(this.nodesSelector());

    if (highlight) {
      // move to Node
      $('.node').removeClass('highlight');
      $nodes.addClass('highlight');
    } else {
      // move to Node
      $('.node').removeClass('highlight');
    }
  }

  highlightNetworkedServices(highlight) {
    const { stack } = this.props;
    this.networkedServices().forEach(
      service => service.highlight(highlight, 'networked')
    );
  }

  name() {
    const { name } = this.props.service;
    return name;
  }

  networks() {
    const { networks } = this.props.service;
    return networks;
  }

  networkedServices() {
    const { stack } = this.props;
    return stack
           .dashboard()
           .services()
           .filter(service => this.isNetworkedService(service));
  }

  isNetworkedService(service) {
    const { networks, name } = this.props.service;
    if (service.name() === name) return false;

    const networkIds = new Set(networks.map(network => network.id));
    const serviceNetworkIds = service.networks().map(network => network.id);
    const intersect = serviceNetworkIds.filter(id => networkIds.has(id));

    return intersect.length > 0;
  }

  nodesSelector() {
    const { tasks } = this.props.service;
    return tasks.map(task => `#node-${task.nodeID}`).join(', ');
  }

  tasks() {
    const { tasks } = this.props.service;
    const sortBy = (task) => (task.when && moment(task.when) || Infinity);

    return tasks.sort(
      (a, b) => (sortBy(a) - sortBy(b))
    );
  }

  toggle(ev) {
    if (['A', 'SPAN'].includes(ev.target.tagName)) return false;

    const { highlight } = this.state;
    const { stack } = this.props;
    if (!highlight) {
      stack.dashboard().services().map(
        service => service.highlight(false)
      );
    }

    this.highlightRelated(!highlight);
    return false;
  }

  modeIcon(mode) {
    switch (mode) {
      case 'global':
        return Icon.Globe;
      case 'replicated':
        return Icon.Copy;
    }
  }

  renderMode() {
    const { mode } = this.props.service;
    const icon = this.modeIcon(mode);
    const title = `Deployment mode: <em>${mode}</em>`;

    return React.createElement(
      icon,
      {
        title: title,
        'data-toggle': 'tooltip',
        'data-html': 'true',
        className: 'mode-icon'
      }
    );
  }

  nameLink() {
    const { service } = this.props;

    if (!service.nameURL) return (
      <span className={'service-name'}>
        {service.name}
      </span>
    );

    return (
      <a className={'service-name'} href={service.nameURL} target={'_blank'}>
        {service.name}
      </a>
    );
  }

  imageLabel() {
    const { organization, repository, tag } = this.props.service.image;
    return (
      <span className={'image-label'}>
        <span className={'organization'}>
          {organization}
        </span>
        <span className={'punctuation'}>
          {'/'}
        </span>
        <span className={'repository'}>
          {repository}
        </span>
        <span className={'punctuation'}>
          {':'}
        </span>
        <span className={'tag'}>
          {tag}
        </span>
      </span>
    );
  }

  imageLink() {
    const { imageURL } = this.props.service;

    if (!imageURL) return (
      <span className={'image'}>
        {this.imageLabel()}
      </span>
    );

    return (
      <a className={'image'} href={imageURL} target={'_blank'}>
        {this.imageLabel()}
      </a>
    );
  }

  renderCollapsed() {
    const { name, environment, mounts, updating } = this.props.service;
    const { stack, service } = this.props;
    const { highlight } = this.state;
    const highlightClass = highlight ? `highlight ${this.state.highlightClass}` : '';
    const updatingClass = updating ? 'updating' : '';
    const dashboard = stack.dashboard();
    const networkTooltip = 'Reachable via a Docker network';

    return (
      <tr
        onClick={(ev) => this.toggle(ev)}
        key={`service-collapsed-${service.name}`}
        className={`service collapsed ${highlightClass} ${updatingClass}`}>
        <th className={'service-title'}>
          <span
            className={'network-icon'}
            title={networkTooltip}
            data-original-title={networkTooltip}
            data-toggle={'tooltip'}>
            <Icon.Wifi size={'1.4em'} />
          </span>
          {this.countBadge()}
          {this.renderMode()}
          <span>
            {this.nameLink()}
          </span>
        </th>
        <td>
          <Environment compact={true} serviceName={name} dashboard={dashboard} environment={environment} />
          <Mounts compact={true} serviceName={name} mounts={mounts} />
          {this.updateStatus()}
          <span className={'image-id'}>{this.imageLink()}</span>
        </td>
        <td className={'ports'}>
          {this.renderPortsCollapsed()}
        </td>
     </tr>
    );
  }

  renderExpanded() {
    const { name, image, environment, mounts, updating } = this.props.service;
    const { stack } = this.props;
    const dashboard = stack.dashboard();

    return (
      <div className={'service ' + (updating ? 'updating' : '')}>
        <h2>
          {this.updateStatus()}
          <span className={'title'}>{this.nameLink()}</span>
          <Environment serviceName={name} dashboard={dashboard} environment={environment} />
          <Mounts serviceName={name} mounts={mounts} />

          {this.imageLink()}
          {this.renderPortsExpanded()}
        </h2>

        <div className={'tasks'}>
          {this.tasks().map(task => (
            <Task
              key={task.id}
              task={task}
              stack={stack}
              manifest={this.props.manifest}
            />
          ))}
        </div>
      </div>
    );
  }

  render() {
    const { collapsed } = this.props;

    return collapsed ? this.renderCollapsed() : this.renderExpanded();
  }
}

export default Service;
