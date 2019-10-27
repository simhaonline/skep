import { connect } from 'react-redux';

import OverviewDetail from './overview_detail';
import Messages from '../messages';

class ConnectedServicesDetail extends OverviewDetail {
  title() {
    return 'Services';
  }

  render() {
    const { global, replicated } = this.statistics().services;

    const data = [
      {
        title: 'Global',
        value: global
      },
      {
        title: 'Replicated',
        value: replicated
      }
    ];

    return this.renderRows(data);
  }
}

const select = (state) => {
  return { swarm: state.swarm, nodes: state.nodes };
};

const ServicesDetail = connect(select)(ConnectedServicesDetail);
export default ServicesDetail;
