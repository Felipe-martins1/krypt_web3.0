import React, {useEffect, useState, createContext, ReactNode, EventHandler} from "react";
import {ethers} from "ethers";

import { contractABI, contractAddress } from "../utils/constants";

export const TransactionContext = createContext<any>({});

const {ethereum}: any = window;

interface ProviderProps {
    children: ReactNode;
}


const getEthereumContract = () => {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const transactionContract = new ethers.Contract(contractAddress, contractABI, signer)

    return transactionContract
}

export const TransactionProvider = ({children} : ProviderProps) => {
    const [currentAccount, setCurrentAccount] = useState("");
    const [formData, setFormData] = useState({addressTo: "", amount: "", keyword: "", message: ""});
    const [isLoading, setIsLoading] = useState(false)
    const [transactionCount, setTransactionCount] = useState(localStorage.getItem("transactionCount"))
    const [transactions, setTransactions] = useState([])

    const handleChange = (e: any, name: string) => {
        setFormData((prevState) => ({
            ...prevState,
            [name]: e.target.value
        }))
    }

    const verifyIfMetamaskIsInstalled = () => {
        if(!ethereum){
            alert("Please, install metamask")
            return false
        }
        return true
    }

    const getAllTransactions = async () => {
        try{
            if(!verifyIfMetamaskIsInstalled()) return;
            const transactionContract = getEthereumContract();
            const availableTransactions = await transactionContract.getAllTransactions()

            const struccturedTransactions = availableTransactions.map((transaction: any) => ({
                addressTo: transaction.receiver,
                addressFrom: transaction.sender,
                timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
                message: transaction.message,
                keyword: transaction.keyword,
                amount: parseInt(transaction.amount._hex) / (10 ** 18)
            }))

            setTransactions(struccturedTransactions)
        }catch(error){
            console.log(error)
        }
    }

    const checkIfWalletIsConnected = async () => {
        try{
            if(!verifyIfMetamaskIsInstalled()) return;

            const accounts = await ethereum.request({method: 'eth_accounts'});
    
            if(accounts.length){
                setCurrentAccount(accounts[0])
    
                getAllTransactions();
            }else{
                console.log("No accounts found.")
            }
        }catch(error){
            console.log(error)

            throw new Error("No ethereum object")
        }
    }


    const checkIfTransactionsExist = async () => {
        try{
            const transactionContract = getEthereumContract();
            const transactionCount = await transactionContract.getTransactionCount();

            window.localStorage.setItem("transactionCount", transactionCount)
        }catch(error){
            console.log(error)

            throw new Error("No ethereum object")
        }
    }

    const connectWallet = async () => {
        try{
            checkIfWalletIsConnected();
            const accounts = await ethereum.request({method: 'eth_requestAccounts'});

            setCurrentAccount(accounts[0])
            getAllTransactions();
        }catch(error){
            console.log(error)

            throw new Error("No ethereum object")
        }
    }

    const sendTransaction = async () => {
        try{
            if(!verifyIfMetamaskIsInstalled()) return;
            const {addressTo, amount, keyword, message} = formData;
            const transactionContract = getEthereumContract();

            const parsedAmount = ethers.utils.parseEther(amount)

            await ethereum.request({
                method: "eth_sendTransaction",
                params: [{
                    from: currentAccount,
                    to: addressTo,
                    gas:"0x5208", // 2100 GWEI
                    value: parsedAmount._hex,
                }]
            })

            const transactionHash = await transactionContract.addToBlockchain(addressTo, parsedAmount, message, keyword);

            setIsLoading(true)
            console.log(`Loading - ${transactionHash.hash}`)
            await transactionHash.wait()
            setIsLoading(false)
            console.log(`Success - ${transactionHash.hash}`)

            const transactionCount = await transactionContract.getTransactionCount();
            setTransactionCount(transactionCount.toNumber())

        }catch(error){
            console.log(error)

            throw new Error("No ethereum object")
        }
    }

    useEffect(() => {
        checkIfWalletIsConnected();
        checkIfTransactionsExist();
    }, [])

    return(
        <TransactionContext.Provider value={{
            connectWallet,
            currentAccount,
            handleChange,
            formData,
            setFormData,
            sendTransaction,
            transactions,
            isLoading
        }}>
            {children}
        </TransactionContext.Provider>
    )
}