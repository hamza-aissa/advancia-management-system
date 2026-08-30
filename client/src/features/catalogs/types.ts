export interface LicenseOffer {
  id: string
  name: string
  description?: string
  unitPrice: number
  active: boolean
}

export interface ContractType {
  id: string
  name: string
  description?: string
  active: boolean
}
