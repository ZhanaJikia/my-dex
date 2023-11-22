//SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.0;

contract Token {
    string public name;
    string public symbol;
    uint public decimals = 18;
    uint public totalSupply;

    // Track account balances
    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;

    event Transfer(
        address indexed _from,
        address indexed _to,
        uint _value
    );

    event Approval(
        address indexed _owner,
        address indexed _spender,
        uint _value
    );

    constructor(
        string memory _name,
        string memory _symbol,
        uint _totalSupply
    )
    
    {
        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply * (10 ** decimals);
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address _to, uint _value) public returns (bool success) {
        
        _transfer(msg.sender, _to, _value);

        return true;
    }

    function approve(address _spender, uint _value) public returns (bool success) {

        require(
            _spender != address(0),
            "Approval of zero address is not permitted"
        );

        allowance[msg.sender][_spender] = _value;

        emit Approval(msg.sender, _spender, _value);

        return true;
    }

    function transferFrom(address _from, address _to, uint _value) public returns (bool success) {

        require(
            allowance[_from][msg.sender] >= _value,
            "Insufficient allowance"
        );

        _transfer(_from, _to, _value);

        allowance[_from][msg.sender] = allowance[_from][msg.sender] - _value;

        return true;
    }

    function _transfer(address _from, address _to, uint _value) internal {
        require(
            balanceOf[_from] >= _value,
            "Insufficient funds"
        );

        require(
            _to != address(0),
            "Transferring to zero address is not permitted"
        );

        balanceOf[_from] = balanceOf[_from] - _value;
        balanceOf[_to] = balanceOf[_to] + _value;

        emit Transfer(_from, _to, _value);
    }

}