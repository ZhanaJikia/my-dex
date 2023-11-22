// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.0;

import "./Token.sol";

contract Exchange {   

    struct _Order {
        // Attributes of an order
        uint id; // Unique identifier for order
        address user; // User who made order
        address tokenGet; // Contract address of the token the user gets
        uint amountGet; // Amount the user gets
        address tokenGive; // Contrat address of the token the user gives away
        uint amountGive; // Amount the user gives
        uint timestamp; // When the order was created
    }

    address public feeAccount;
    uint public feePercent;
    uint public orderCount;

    mapping(address => mapping(address => uint)) public tokens;
    mapping(uint => _Order) public orders;
    mapping(uint => bool) public orderCancelled;
    mapping(uint => bool) public orderFilled;

    event Deposit(
        address _token,
        address _user,
        uint _amount,
        uint _balance
    );

    event Withdraw(
        address _token,
        address _user,
        uint _amount,
        uint _balance
    );

    event Order(
        uint _id,
        address _user,
        address _tokenGet,
        uint _amountGet,
        address _tokenGive,
        uint _amountGive,
        uint _timestamp
    );

    event Cancel(
        uint _id,
        address _user,
        address _tokenGet,
        uint _amountGet,
        address _tokenGive,
        uint _amountGive,
        uint _timestamp
    );

    event Trade(
        uint _id,
        address _user,
        address _tokenGet,
        uint _amountGet,
        address _tokenGive,
        uint _amountGive,
        address _creator,
        uint _timestamp
    );

    constructor(address _feeAccount, uint _feePercent) {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    function depositToken(address _token, uint _amount) public {
        Token(_token).transferFrom(msg.sender, address(this), _amount);
        tokens[_token][msg.sender] = tokens[_token][msg.sender] + _amount;

        emit Deposit(_token, msg.sender, _amount, balanceOf(_token, msg.sender));
    }

    function withdrawToken(address _token, uint _amount) public {
        Token(_token).transfer(msg.sender, _amount);
        tokens[_token][msg.sender] = tokens[_token][msg.sender] - _amount;

        emit Withdraw(_token, msg.sender, _amount, balanceOf(_token, msg.sender));
    }

    function balanceOf(address _token, address _user) public view returns (uint) {
        return tokens[_token][_user];
    }

    function makeOrder(address _tokenGet, uint _amountGet, address _tokenGive, uint _amountGive) public {
        
        require(
            balanceOf(_tokenGive, msg.sender) >= _amountGive,
            "Insufficient balance"
        );

        require(
            _amountGet % 100 == 0,
            "Invalid value for _amountGet. Must be multiple of 100."
        );
        
        orderCount = orderCount + 1;

        orders[orderCount] = _Order(
            orderCount,
            msg.sender,
            _tokenGet,
            _amountGet,
            _tokenGive,
            _amountGive,
            block.timestamp
        );

        emit Order(
            orderCount,
            msg.sender,
            _tokenGet,
            _amountGet,
            _tokenGive,
            _amountGive,
            block.timestamp
        );
    }

    function cancelOrder(uint _id) public {
        // Fetch order
        _Order memory _order = orders[_id];

        // Order must exist
        require(
            _order.id == _id,
            "Invalid order id"
        );

        // Ensure the caller of the function is the owner of the order
        require(
            _order.user == msg.sender,
            "You're not authorized to cancel this order"
        );

        orderCancelled[_id] = true;

        emit Cancel(
            _order.id,
            msg.sender,
            _order.tokenGet,
            _order.amountGet,
            _order.tokenGive,
            _order.amountGive,
            block.timestamp
        );
    }

    function fillOrder(uint _id) public {
        
        // Fetch order
        _Order memory _order = orders[_id];

        // Order must exist
        require(
            _id > 0 && _id <= orderCount,
            "Invalid order id"
        );

        // Order can't be already filled
        require(
            !orderFilled[_id],
            "Order already filled"
        );

        // Order can't be cancelled
        require(
            !orderCancelled[_id],
            "Can't fill cancelled order"
        );

        // Execute the trade
        _trade(
            _order.id,
            _order.user,
            _order.tokenGet,
            _order.amountGet,
            _order.tokenGive,
            _order.amountGive
        );

        // Mark order as filled
        orderFilled[_order.id] = true;
    }

    function _trade(
        uint _orderId,
        address _user,
        address _tokenGet,
        uint _amountGet,
        address _tokenGive,
        uint _amountGive
    ) internal {
        // Fee is paid by the user who filled the order (msg.sender)
        // Fee is deduced from _amountGet
        uint _feeAmount = _amountGet * feePercent / 100;

        // User who fills the order must have sufficient balance
        require(
            balanceOf(_tokenGet, msg.sender) >= _amountGet + _feeAmount,
            "Insufficient balance"
        );

        // Execute the trade
        // msg.sender is the user who filled the order,
        // while _user is the one who created the order.
        tokens[_tokenGet][msg.sender] -= _amountGet + _feeAmount;
        tokens[_tokenGet][_user] += _amountGet;

        tokens[_tokenGive][msg.sender] += _amountGive;
        tokens[_tokenGive][_user] -= _amountGive;

        // Charge fees
        tokens[_tokenGet][feeAccount] += _feeAmount;

        // Emit trade event
        emit Trade(
            _orderId,
            msg.sender,
            _tokenGet,
            _amountGet,
            _tokenGive,
            _amountGive,
            _user,
            block.timestamp
        );
    }

}
