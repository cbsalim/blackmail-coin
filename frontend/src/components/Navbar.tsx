'use client'

import Link from 'next/link'
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet'
import { Address, Avatar, Name, Identity } from '@coinbase/onchainkit/identity'

export default function Navbar() {
  return (
    <nav className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Blackmail
        </Link>
        <div className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
          <Link href="/explore" className="hover:text-gray-900 transition-colors">
            Explore
          </Link>
          <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/create"
          className="hidden sm:block px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Create Pact
        </Link>
        <Wallet>
          <ConnectWallet>
            <Avatar className="h-6 w-6" />
            <Name />
          </ConnectWallet>
          <WalletDropdown>
            <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
              <Avatar />
              <Name />
              <Address />
            </Identity>
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </div>
    </nav>
  )
}
