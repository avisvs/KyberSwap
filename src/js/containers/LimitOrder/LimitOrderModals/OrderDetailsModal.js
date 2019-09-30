import React, { Component } from 'react';
import { connect } from "react-redux";
import { getTranslate } from "react-localize-redux";
import { Modal } from "../../../components/CommonElement";
import * as limitOrderActions from "../../../actions/limitOrderActions";
import limitOrderServices from "../../../services/limit_order";
import * as common from "../../../utils/common";
import * as converters from "../../../utils/converter";
import {LIMIT_ORDER_CONFIG} from "../../../services/constants";
import BLOCKCHAIN_INFO from "../../../../../env";
import {displayNumberWithDot} from "../../../utils/converter";
import {toT} from "../../../utils/converter";
import {convertBuyRate} from "../../../utils/converter";
import {roundingRateNumber} from "../../../utils/converter";
import {formatNumber} from "../../../utils/converter";
import {multiplyOfTwoNumber} from "../../../utils/converter";

@connect((store, props) => {
  const translate = getTranslate(store.locale);
  const limitOrder = store.limitOrder;
  const global = store.global;
  const account = store.account.account;
  return {
    translate,
    limitOrder,
    global,
    account
  };
})
export default class OrderDetailsModal extends Component {
  constructor() {
    super();

    this.state = {
      cancelError: null
    };
  }

  contentModal = () => {
    const { order } = this.props
    let source = order.source == "WETH" ? "ETH*" : order.source
    let dest = order.dest == "WETH" ? "ETH*" : order.dest
    const { min_rate, fee, src_amount, status, side_trade } = order;
    const base = side_trade == "buy" ? dest : source
    const quote = side_trade == "buy" ? source : dest
    const pair = side_trade == "buy" ? `${dest}/${source}` : `${source}/${dest}`
    const rate = side_trade === 'buy' ? roundingRateNumber(toT(convertBuyRate(min_rate))) : displayNumberWithDot(min_rate, 9)
    const amount = side_trade == "buy" ? formatNumber(multiplyOfTwoNumber(src_amount, min_rate), 6) : formatNumber(src_amount, 6)
    const total = side_trade == "buy" ? formatNumber(src_amount, 6) : formatNumber(multiplyOfTwoNumber(src_amount, min_rate), 6)
    return (
      <div className="limit-order-modal">
        <div className="limit-order-modal__body">
          <div className="limit-order-modal__title">
            { `${side_trade ? side_trade : ""} ${base} Order`}
          </div>

          <div className="limit-order-modal__close"
               onClick={e => this.closeModal()}>
            <div className="limit-order-modal__close-wrapper" />
          </div>
          <div className="limit-order-modal__content">
            <div className="limit-order-modal__message limit-order-modal__message--text-small">
              {common.getFormattedDate(order.updated_at)} {' '}
              <span className={`cell-status cell-status--${order.status}`}>
                                    {(order.status)}
                                </span>
            </div>
            <div className={"order-table-info"}>
              <div className={"order-table-info__header"}>
                <div>{"Pair"}</div>
                <div>{"Price"}</div>
                <div>{"Amount"}</div>
                <div>{"Total"}</div>
                {status === LIMIT_ORDER_CONFIG.status.FILLED && <div>Received</div>}
                <div>{"Fee"}</div>
                <div>{"Address"}</div>
                <div>{"Action"}</div>
              </div>
              <div className={"order-table-info__body"}>
                <div className={"info"}>
                  <div>{pair}</div>
                  <div>{rate}</div>
                  <div>{`${amount} ${base}`}</div>
                  <div>{`${total} ${quote}`} </div>
                  {status === LIMIT_ORDER_CONFIG.status.FILLED && <div>{`${order.receive} ${dest.toUpperCase()}`}</div>}
                  <div>{`${converters.formatNumber(converters.divOfTwoNumber(converters.multiplyOfTwoNumber(fee, src_amount), 100), 5, '')} ${source.toUpperCase()}`}</div>
                  <div>{`${order.user_address.slice(0, 8)}...${order.user_address.slice(-4)}`}</div>
                  <div className="cell-action">
                    {status === LIMIT_ORDER_CONFIG.status.OPEN && <button className="btn-cancel-order theme__button-2" onClick={e =>this.confirmCancel()}>{this.props.translate("limit_order.cancel") || "Cancel"}</button>}
                    {status === LIMIT_ORDER_CONFIG.status.FILLED && <button className="btn-cancel-order btn-cancel-order--view-tx theme__button-2" onClick={e => window.open(BLOCKCHAIN_INFO.ethScanUrl + 'tx/' + order.tx_hash)}>{this.props.translate("limit_order.view_tx") || "View tx"}</button>}
                    {status !== LIMIT_ORDER_CONFIG.status.OPEN && status !== LIMIT_ORDER_CONFIG.status.FILLED && this.props.screen !== "mobile" && <div className="line-indicator"></div>}
                  </div>
                </div>
              </div>
              <div className={"common__text-red"}>{this.state.cancelError}</div>
            </div>
          </div>
        </div>
        <div className="limit-order-modal__body"/>
      </div>
    )
  }

  closeModal = () => {
    this.props.closeModal();
    this.setCancelErrorMessage(true);
  };

  setCancelErrorMessage = (isReset = false) => {
    let errorMessage = this.props.translate("limit_order.cancel_error") || "Something went wrong with cancel order process.";

    if (isReset) errorMessage = null;

    this.setState({ cancelError: errorMessage});
  };

  async confirmCancel() {
    this.props.global.analytics.callTrack("trackClickConfirmCancelOrder", this.props.order ? this.props.order.id : null);
    if (this.props.order) {
      try {
        const results = await limitOrderServices.cancelOrder(
          this.props.order
        );
        if (results) {
          if (this.props.limitOrder.filterMode === "client") {
            this.props.dispatch(limitOrderActions.updateOpenOrderStatus());
          } else {
            this.props.dispatch(limitOrderActions.getOrdersByFilter({}));

            if (this.props.account) {
              this.props.dispatch(limitOrderActions.getPendingBalances(this.props.account.address));
            }
          }
          this.props.dispatch(limitOrderActions.getListFilter());
          this.props.closeModal();
        } else {
          this.setCancelErrorMessage();
        }
      } catch (err) {
        console.log(err);
        this.setCancelErrorMessage();
      }
    }
  }

  render() {
    return (
      this.props.order && (
        <Modal
          className={{
            base: "reveal large confirm-modal",
            afterOpen: "reveal large confirm-modal"
          }}
          isOpen={this.props.isOpen}
          onRequestClose={this.closeModal}
          contentLabel="Order Details"
          content={this.contentModal()}
          size="medium"
        />
      )
    )
  }
}