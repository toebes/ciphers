import { CipherTestManage } from './ciphertestmanage';
import { toolMode, IState, CipherHandler } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { BoolMap, cloneObject, StringMap, timestampFromMinutes, timestampToFriendly } from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTFDialog } from '../common/jtfdialog';
import { ConvergenceAuthentication } from './authentication';
import Convergence = require('@convergence/convergence');
import { LogLevel, ModelService, RealTimeModel } from '@convergence/convergence';
import { globalPermissionId, IAnswerTemplate, IRealtimeObject, RealtimeSinglePermission } from './ciphertest';
import { EnsureUsersExistParameters } from './api';


export interface MaintenanceState extends IState {
    /** User to log in to system as */
    userid?: string
    /** Password for the user */
    password?: string
    /** Known users for any tests */
    activeUsers?: Map<string, boolean>
    /** Session token */
    sessiontoken?: string
    /** Active users for a test */
    activeTestUsers?: Map<string, BoolMap>
    /** Where we are in the list of models */
    currentslot?: number
    jwt?: string
}

const models: string[] = [
    "0002daf8-3fbf-4fc8-8b20-4ae3d6aff59e",
    "016c7c57-156b-4896-a7f6-c59fedcd123c",
    "02b3fb0e-2ff6-449f-88b1-5c3a9c621271",
    "037b416f-feaf-45cd-a888-8d3e387a6439",
    "03cad170-5f73-4485-b9ef-a0fcce29668a",
    "045c6b95-ead2-4721-a710-9b27cc3e8ab6",
    "05640488-f11e-4f32-bbd8-005275c6d081",
    "071e7e07-f822-46f0-a5e7-55c60cbc2774",
    "09784613-f9ce-4d77-86c9-5b37ca279db1",
    "09aa690c-6ebb-495d-8b6b-c0daceac9a3e",
    "09d3be86-00ca-4c5a-a33c-a6e0e530cbe3",
    "0adf13a9-25c6-42fe-b428-64071dbf201d",
    "0ce9fecb-eb20-454e-9024-5d762ec98ad5",
    "0d42e82c-2ddf-4ca9-b1f6-2d5908cd9056",
    "0d55b4d7-630f-446a-9922-4afc828284dd",
    "0d8fb4cc-fb8b-4c4b-8996-865ef650595b",
    "0ed2610e-1961-46c7-8a1f-a84605aa9508",
    "0f030647-3260-441f-97ec-51c4dfd0efa6",
    "0ff963d3-fef7-47b8-b8cb-364316edea97",
    "1035dd83-3e87-4f40-8764-6d6e1e6c483d",
    "10a47269-c83c-4875-baca-143e68c60ce2",
    "10eab5f4-6a7e-48d7-8f6a-2b7d553afe0f",
    "1201b0b6-1620-4cd5-8972-6632d6ac3f7c",
    "158669d1-e8ec-439a-8a4f-2aad57204564",
    "1651fcc1-20b7-467e-a372-53103976b04e",
    "16acf39e-68ce-4577-8f30-ddb50a0e40a2",
    "17945c07-a43f-47b4-b9df-45bb7befe581",
    "179ea724-dc9e-4d73-b439-4a5a71878c3f",
    "18de1891-01b1-4ea2-bed1-3db8daaf152a",
    "197af73c-e570-4d59-b12a-5c8e0a1a2029",
    "1acff296-42b5-4830-83e7-979376bc8b75",
    "1b73e1b7-f112-43a8-ae8c-0abfb88dff23",
    "1c88a8da-45e2-45cf-908d-2c8a3c87b359",
    "1c9ddf76-1007-48f0-b210-8fb8aa0beef1",
    "1d4ae248-4910-40d4-8ef8-ee8a8c08ddc5",
    "1d7b634f-d95b-4777-9344-024089d3f430",
    "1e74b06e-2fa6-420a-b293-a636d034fbe5",
    "1eee31cf-7bbf-4020-b536-aa1c87037367",
    "1fbbe7c6-0401-427b-a97c-a17bf7b3256b",
    "2108be7b-12b9-4928-94d1-583b70125ad9",
    "21f5425e-f4bb-4835-b472-4d875d528ac6",
    "22043382-9f8d-4198-b0d5-031fd8eb8b66",
    "22651e15-6fd7-4932-b79b-29865cad2a43",
    "22732c05-40a3-4d8d-972c-aae5101c224c",
    "22ab5b83-032a-4ff0-9317-3430176e7022",
    "22ba9bd8-4efb-4204-80a6-373545143976",
    "233659e2-a88c-405c-96a2-a8fd31b7b86b",
    "23a8e3f2-0272-4504-9c58-bacca65a2462",
    "2438479b-8a26-4e2c-9ca2-88332e029852",
    "25d1f15a-769c-4ac6-90e7-25bc9a923020",
    "27458fb0-7e74-41ff-b5ba-6f89687b7f74",
    "274e818c-7d98-4b0d-a923-56eb2aa4bc2b",
    "27c38b76-7d38-47bb-92fe-5b702f4eb123",
    "284a7102-14cb-4b17-8d3d-9ea115b9ecc3",
    "289760a5-3efd-45a6-be05-ba4269224946",
    "294b1f46-fa27-4b5b-a4a3-c242c9b95df1",
    "2a04678f-bfb8-4912-8ae3-321e1a55a1b6",
    "2a75a809-9cd8-4432-886f-97aecd640a0f",
    "2b58b287-51a6-4c85-a3f2-8b7bcd9b4a57",
    "2bb6eb36-f30c-4302-8ad1-23de583fa5e5",
    "2be75925-5bf5-42b2-85d3-0a3a4ec24b0f",
    "2cc760f3-c200-41c5-947e-cb06aa77961b",
    "2cd8d05a-5906-4347-8f04-272765402072",
    "2cf85e21-e0dc-4b6d-9bc2-9b3829e838b8",
    "2d0d01e1-a94d-466a-b476-6dab1143abb1",
    "2dc126ee-9f9d-479a-8d2a-c369e36fbde4",
    "301454ab-689a-4f35-b3a4-00260be2125b",
    "305f7b02-13ba-4d57-8d09-ea39775aad62",
    "308c5238-cf8e-426e-852f-b9946d478048",
    "319e0c6e-75d7-485d-91db-3784332a6195",
    "31d5c8db-69c9-4ff6-aab8-4c7d58ad9c7c",
    "3320642a-5845-4565-a331-90547ca5e498",
    "33643d31-32a4-4f12-8f52-0776f5e2c02c",
    "348ac436-1669-4096-b516-699cb7a78e7a",
    "363855be-79e2-4099-b6b7-26dfabb95404",
    "36911549-2e9a-4507-9ddb-fbb480b46de2",
    "372ff77d-725a-4496-be27-180186b8e637",
    "37718f86-a6ce-44c3-ae42-4a55e7bc1d6b",
    "3a22bcde-4ca3-4fb0-9e27-dc24ce3ce9c6",
    "3c1eae7b-3a74-44a7-bbc9-52680566e3f4",
    "3dc95cab-bf80-4350-9463-3dad373c9f79",
    "3f0921c4-d3df-46ca-a514-5a63304d8104",
    "3f375bbc-afe0-46d2-b634-e1f2cf5ba379",
    "3f5acf51-363a-4018-92f2-4c85437a327c",
    "4313e426-2620-4f4d-a574-4a1448ccbf7f",
    "44ee4342-2c3d-4b49-920c-421e3e23a168",
    "452f6be9-e53f-4b43-8365-03a29dd064ff",
    "476dacbc-78b6-4cc8-94a0-de6728f6d61c",
    "48064dca-0360-4e98-ae2d-78088f95e758",
    "482523e9-98bc-4cfc-8545-cdc6ed7ede0a",
    "4943d6af-ed20-4cd6-8a55-40d1cc3b56f4",
    "4aeb71a2-1011-4c4a-affc-6db1e2f51284",
    "4d0193e8-a76b-42be-9308-3087d0a1cf6b",
    "4db0e459-af11-4ffa-9357-9b23b7cc187b",
    "5285ea35-19d7-4615-b4a3-507529740db0",  /// LONG......
    "52ae71c2-cefc-467d-87a4-9defdee00741",
    "54145cdd-3c3c-454a-931f-e0a696ad8a72",
    "5534ca5c-9bfe-457d-96eb-362ac05ed1e0",
    "56bcd4d4-773c-43f8-a858-8e36f611c809",
    "571cfb00-3b4f-4ec1-8fe0-a8530a3a7ef7",
    "5798bf4b-0e18-4d25-b2e5-3eecfd8e10e1",
    "57a4315e-a7ec-4919-bc0a-0d214c9cdeac",
    "582b1506-4f94-405d-a65d-4bd886126dc9",
    "59315f7d-ebdc-4dbb-bcc5-b98a676f45c6",
    "59edaa57-4171-45aa-a619-fa4933958e84",
    "5a7abaf3-c441-44ec-8692-44a375eb3015",
    "5ad0a6cb-aedc-44e5-b120-4f629ade4fd2",
    "5b2ed8c3-07bf-4b87-8bce-497e539a633c",
    "5b74828d-5273-4ffb-8e09-764868069fee",
    "5ba71a35-e026-4921-a7a1-c1073b468358",
    "5ca7b04b-fa22-47ba-80b4-68c37edbd0aa",
    "5d7d2bc1-72a4-4ead-84ba-40588714ee17",
    "5dcc0275-5a7b-4a0f-985a-8cb7942f7dd7",
    "5ede0b8d-c33f-46a0-ad76-95e9e8503bce",
    "64c2f20b-eaaa-438d-a9f0-fb241dd473c4",
    "64d6f5c6-c98b-4349-95d0-f29480bd5d26",
    "66e085cd-d4de-4690-976f-ab46278d1a49",
    "67922f93-7e8d-4a79-8178-900c798eccf1",
    "67d7d9e7-2e0c-4e58-97b8-b8e88149ab4e",
    "6877c554-b784-43be-a479-1af6a34f6911",
    "688920d7-024c-4db8-aa54-d358e486d56a",
    "69155bfb-6db2-46bd-8928-dfaa79f467a4",
    "6a75ed53-fb56-4fb0-a293-03e4ea03e9bf",
    "6ac6428c-8d5e-48d7-afa7-3d35acd0a562",
    "6aea3213-a7c8-484d-a4a3-7777d5fb32d6",
    "6b20c4bc-1495-4ffd-b7da-b38a4629e7e6",
    "6bc9d936-39c3-4876-a0aa-26971db0bc40",
    "6bdb88ed-7e7c-4330-a5c3-4af2150c11c6",
    "6c5798b4-cdc0-48d0-aee1-2584e52a9e5a",
    "6d7feb08-14c4-47a2-8894-7ebc1724213d",
    "6dd6933b-a720-44ee-8fdc-96843baff76d",
    "6e8e8080-664c-4372-be21-c3969753ba8a",
    "6f24f1a3-6ce0-418b-9f5b-a62b344fb9a3",
    "6f3777c3-ae24-40a6-b50f-7ede3ce651c4",
    "7046232f-60c1-4640-8dc9-df14e3c3eeba",
    "70b07e7d-a19c-46e3-a680-f85cf82430a7",
    "723b270d-fd52-49d6-9904-2b29b724ac0b",
    "72561ce1-2929-4438-a8bc-6f1850562d3d",
    "729467e1-e9cc-455f-98ea-e83f11cd7e29",
    "73c36d12-e864-4eec-a494-c5a4de52815c",
    "75cb2719-4128-4201-9c85-5397b7eb73e2",
    "75df8e25-f06f-4aae-aabe-70afa0a93cb4",
    "76b8be24-97a9-4c2a-be14-531c4ac4d748",
    "76d5ac98-da7c-453b-b109-2caf805b0a50",
    "77c9d90f-3303-4814-ba52-7423c692d19d",
    "787cc4b8-664e-4a88-860f-5ad959541260",
    "7918cfb2-05eb-412e-84f0-c02ae76cecf6",
    "798cd8ee-866d-4f76-8235-8ede985735e2",
    "7ac57b60-f450-43bd-ad0d-c32e4d24fc1a",
    "7ad3d00c-7a3f-4fab-9c57-7251556e2c8c",
    "7b6a5c7d-705f-4635-ba63-54b1319f01fa",
    "7d01ca9a-1605-44f5-b2be-4311a1459ac4",
    "7d72cfeb-9dd3-453f-8180-6287c12763a2",
    "7deaf896-6aac-4b56-b65d-5c8674a27e71",
    "7f0cd1f6-1dd9-441b-b7dc-50c825457a01",
    "808be078-80f0-42fa-836b-e69eb76fce7f",
    "80aee96f-6db8-431e-90ba-c98d29a7047c",
    "81360190-7d13-4ad3-8984-029aef39c09f",
    "81dcf4f7-2277-414c-8cb0-5d0d28b018b3",
    "820333d9-734b-4a9c-a04e-c28b4d2edf16",
    "830c07de-1749-40e9-8b13-31bcb2d72772",
    "83b3382e-a973-46c1-8e8d-e3aabb2d5cf7",
    "84bb3b1d-cf8e-447a-96bf-5679400e5b5a",
    "84ccb1e3-addc-4061-937e-4356ac65c00b",
    "871ec65c-0aad-4477-b5bf-af0c8d555444",
    "87d13dd5-afbe-4a15-ad67-20fe9a62a324",
    "887f46ff-2312-48e7-b048-9ce153a2942c",
    "8905dd44-ba82-4b53-bedc-9924fcaa7ac9",
    "893564b8-c9d0-495e-bbaf-db9dfe893c10",
    "8971afcc-f970-44c9-940f-cdc544112236",
    "89990b05-cdaa-4a7e-894e-959af270bd05",
    "8a3fa12a-47d0-477f-a9f0-12e52c33c60b",
    "8be7c2ed-0e09-4b51-8b45-9669632d0b0c",
    "8c2707df-080f-4faf-840f-0699ae1aee41",
    "8c39f6fa-896f-40cb-bfe0-63397d3f7acd",
    "910fec37-ced7-4e15-b489-876e27f418ca",
    "9190d5de-cb8f-4b38-839f-91338c0ab33e", // BAD
    "927ccc63-f1fa-4852-9b4c-edca42f1fe79",
    "937b236c-ecf8-4bfa-8486-82b1515eeb4c",
    "94fef811-8804-4dcd-abc8-4a3c51130ce9",
    "9548e876-de34-48f4-bf0a-0294806934ce",
    "955dfc74-5a41-46a6-8ab6-110e19f29681",
    "96533474-f0c4-4e54-ad9b-9337083bb951",
    "96692e7b-6f1a-4325-b4b3-6d361dadfd43",
    "96cec1ad-2d5e-4ec5-a968-2627e08a3d7f",
    "98422423-d0df-4fc9-bb13-0e47514cdc89",
    "989751d3-fb13-4502-8881-6c23960b8ddd",
    "98aaa137-8c54-4fcf-8a3b-38ad1471f228",  //BAD
    "99bf7f8b-594e-476a-8f08-de182134b8bb",
    "9b835446-b013-46d0-af8f-d2c7ed4559b4",
    "9b8e56a7-8edb-4e61-8d60-e130032eb907",
    "9d0596b3-f50a-4c44-9b02-663c9070bde1",
    "9d7cc472-d680-4742-86d2-076506b7d9cb",
    "9e2af184-65dc-4999-a1d6-008c37f27b26", // BAD
    "9e3bf6a7-a7e8-430e-a02d-ac014cf2dd97", // BAD
    "9ed0e6e7-b6d7-48ec-af79-16700e02cf50",
    "a0d0a912-3ad6-433b-9592-bba9fcf44dc5",
    "a4a3b73d-6c31-49f9-93fb-91d8aba84599",
    "a5094ee0-0c03-47da-b910-eebab9a34895",
    "a564da26-7410-43b9-8389-af6fe9bb41cd",
    "a6b48927-a6af-464f-8d2e-8742b9d29744",
    "a6d0e2eb-7800-4b5e-a632-96a49cc23650",
    "a85a2b21-0436-4cab-a60f-e301ac328000", // BAD
    "ab81f8a1-e97d-4cc6-ba1f-eb89312b9156",
    "ac8a0354-9bf2-4a87-b8e3-da7f938b1b56", // BAD
    "acfff441-d90c-4e27-b213-7e6e1b54c623",
    "ad5f3776-d5e9-435c-9b21-c3e18eacbf5f",
    "af41620d-2d71-45c9-81c0-94b1f2b8f2e5",
    "af8e3958-bd05-461e-b0a1-889a999af77b",
    "aff2eb99-ef13-4df4-99d2-0bcabc5f599f",
    "b0872710-cdb0-4318-8ea9-22de89425fbc",
    "b0b40e24-35a3-49fd-83d3-88bac758fffb",
    "b19a4ea5-7550-4948-b171-503b308a03ca",
    "b4edf664-d4a8-4487-bf58-5d1c4f9a2460",
    "b75c61e7-aa80-4d1b-b395-6e2bae0cb634",
    "b78e365a-78b8-443f-a4e9-3a46bbe0d30f",
    "bb5f70aa-6cb7-4093-baad-1d551a3942f1",
    "bb5f8fe8-43ef-4f4b-80c6-bd3198dff797",
    "bbf5a370-d871-4f09-ace0-32f13cd857e3",
    "bc95e668-3cfc-49f5-bf16-a2f62443b434",
    "c1c3c9ff-cdd2-4fef-ad5a-062febc8a368",
    "c31caef8-172b-4bcf-acd6-aa16b1aa9bdc",
    "c3ef912d-9150-4d8f-b6a6-e76b3cfbf3dc",
    "c4e66dcf-aebd-44fa-822d-3a885a12695c", // BAD
    "c66257f1-b1e9-4f5c-8d54-97ec9e9c46d9", // BAD
    "c6d363c6-fc8d-4061-95ed-f5aea246be29",
    "c7c0f5f3-c25e-4fdb-bef4-826808790f8c",
    "c8270e77-d9e7-4301-876b-35703c42f689", // BAD
    "c95c16c0-a5b3-4941-b885-d7ce2fd8dd72",
    "c9d8897d-74bb-4c26-a34d-953c122f6174",
    "caf776d7-783d-4095-8f1e-0b2d95ec80ff", // BAD
    "cbe7a41f-87ec-4309-9294-66895c08c459",
    "cc0d71d8-6f8e-47b1-b6d4-34ac3933d169",
    "ccd377f6-27ea-4dc0-b5fd-44b25665bbe4", // BAD
    "cf3ce7e6-c0e9-4b42-8938-70b057f94b24",
    "cf6a4c35-9b51-45a0-b986-4a1a4b156e34",
    "d057360f-f969-4357-b94c-07bc670c3f5b",
    "d1702213-6918-4e8e-8b0d-f8e667af7b2e",
    "d24ed0dc-bb01-4a3d-8fec-00424b385c8a",
    "d3553d66-27f8-45ee-93dd-b9f7cf7e5b27",
    "d364e2b2-a1ad-4185-b377-0ecf473aacd3",
    "d3ac36fa-3f72-4ac1-a2e4-8f87d7a3ac01",
    "d4068a31-ed2a-495c-b6e4-52bd31e14f7f",
    "d407e839-d2f5-47c0-b218-e88228a6c4c6",
    "d4b6ffd4-749f-4460-bbb8-dd110fdbdcd1",
    "d50d2986-0f73-49e8-8ba1-d08a89eec1d8",
    "d51bcd78-893d-4456-80c6-4bd577848a88",
    "d55c6bf8-a440-4e9a-bfdc-46adb2f6b1ce",
    "d5ef703d-bac7-4d61-b98d-3087f8a5a57b",
    "d603cab5-a8e7-4597-b58a-e31a5bdfa783",
    "d66eb976-1a17-45f1-a825-38bb8ff2d196",
    "d6bcb3dc-c721-483d-95b6-ae78c853c14f",
    "d7567531-2d91-4cbe-b702-09179c7afa14",
    "d8b87899-982c-4a4d-8044-d5c55b56a59e",
    "da381e55-fc8c-406c-8e37-070bd44ef707",
    "db3e9540-8a34-40e5-9228-577851162096",
    "dc5f1475-a80b-486b-9579-98b0589ba23a",
    "dd0d3985-43c5-40ea-8719-8369423143e1",
    "dd114067-fa55-4ca9-b76f-3e33a54455f7",
    "ddbd5561-1e7e-4c36-9eec-be1dcf94ba3f",
    "de815c2c-f8cb-4d7d-9992-f3c2c4618c79",
    "de968454-00bc-4431-8adb-d743de93c68c",
    "defd6116-5b44-4d2b-8817-fabb2ce6ffd4",
    "df505319-6ef0-4ab9-9e91-2eb65c0ee4f5",
    "df663775-fb49-4328-9c4a-75862a135a22",
    "dfd21a71-6e1d-4a34-b83c-a0e9ea6c96a1",
    "dff04507-e709-422b-b04b-3bdd98325fe0",
    "e044a665-a8ac-4886-81e9-1ade6ea5a0a7",
    "e0ce2682-3fc4-4079-9596-ec808fa34379",
    "e368f276-e53a-41df-abf9-2df4b7aefbee",
    "e3b5f255-2cd6-44aa-a7db-390f483723b7",
    "e3e09483-b8e1-4002-98b4-b6bfb8bd2683",
    "e4ffa3c5-d4d6-4dc8-84c3-45116d4843bc",
    "e5d925b6-6d74-45fa-a004-5acc5d92f02d",
    "e60b4d43-932e-4958-8835-f1b5ba7d56c5",
    "e6cbd33b-b4e6-46ac-93cc-c49056505c06",
    "e7b4d0e9-37e6-4e6c-becb-1408c0f2186c",
    "e7c88e75-85a0-4c92-b8a4-37b243bbf191",
    "e87b6cc3-1847-4d69-ada4-d422bd928f47",
    "e9748225-4649-425b-9740-4c05a2051542",
    "e9b382f9-299b-4672-a2cc-c99145c00a2b",
    "ea1f7342-9456-4fda-8b4f-67034f37dc12",
    "ea2e5465-e2e4-4b8b-aa2b-9a6420a3cd7d",
    "ea73caa8-e85f-4bcd-a88f-5a4f3b9ed0b9",
    "ea87cb57-e80a-4f8f-9335-29f7aa62a9b2",
    "eb55b8b8-eccd-4053-9906-12883364ff5c",
    "ee064614-8944-442c-be88-2d3103b873b8",
    "ee0f0087-7473-4da6-b117-badf6ca2f897",
    "f11593ee-f037-4c9b-b2db-795940a68cd6",
    "f161ec74-61e3-4f81-a559-f7bb2b033bbb",
    "f1889a94-4c7b-4bef-a380-f0eb098e1c2b",
    "f20a4851-8beb-4959-a55f-7785e3df1936",
    "f25b90aa-1807-4925-abff-9f9df6b9cff7",
    "f272e81f-f425-43ba-affa-ba31fbf484f3",
    "f27ac1ed-a746-4bf5-bab4-2560a1248b08",
    "f294925f-9a0e-4706-9d25-85abbb0ae0ec",
    "f39e4db5-96b7-4301-96b6-3bf6bf761730",
    "f5f57b02-c468-4618-a43b-f811df85d6fb",
    "f6b6e0a3-f032-4859-95a6-fe0b13555e71",
    "f73332a8-281e-48e8-b8ec-43d2395e769d",
    "f7b5f574-0685-44a0-a727-72d7a8f4dc82",
    "f8076e22-5145-45b7-b58b-d9cc44e4f5f0",
    "f893bf2e-576e-4967-beaf-a98594c5ba5a",
    "f950cee8-7be2-4dce-8775-2c04ac243d7c",
    "f9735914-f843-411d-8d0b-40327422107b",
    "f99fb189-4fd4-4ca2-a7a0-d7c772637020",
    "f9e55e47-3355-46e7-bcb5-c0a21f0aa138",
    "fa66ad12-9745-49bf-a5e7-46a45a2398e1",
    "fa996a9c-5840-4ba7-b77e-406dab53f2bb",
    "fb31fc36-51e4-4cd0-8886-07b58faaaae6",
    "fb633040-279f-423a-bf5e-98c9d5a9b63d",
    "fb6f5351-b266-44e7-b201-2ad2a14d33eb",
    "fbcb59e7-d41f-49a9-bf52-cf176a16341f",
    "fce5e168-8de3-4f38-82db-3cf98ef5752f",
    "fd1ccd06-5837-470b-9ebc-afe6d60263a3",
    "fe9d915c-7ea6-4b5b-b252-616ac7650cc6",
    "ff99a079-3629-42c3-b891-5dbb37802623",
    "ffd4c7d0-e469-4519-9f64-f1647d8745d1",
    "3d702c2f-d51c-4eaf-aed6-6175d69958e6",
    "9bb7d8c9-f2e1-4761-8956-02f2fd114013"
]

/**
 * CipherMaintenance
 *   This allows for migrating and deleting old tests/users from the server
 */
export class CipherMaintenance extends CipherTestManage {
    public activeToolMode: toolMode = toolMode.codebusters;

    public defaultstate: MaintenanceState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: MaintenanceState = cloneObject(this.defaultstate) as IState;
    /** Command buttons */
    public cmdButtons: JTButtonItem[] = [
        { title: 'Purge Old Answers', color: 'primary', id: 'purge' },
        { title: 'Copy Tests', color: 'primary', id: 'copytest' }
    ];
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: MaintenanceState, suppressOutput = false): void {
        const curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.state.activeUsers = new Map()
        this.copyState(this.state, data);
        /** See if we have to import an XML file */
        this.checkXMLImport();
        if (!suppressOutput) {
            this.setUIDefaults();
            this.updateOutput();
        }
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        return null;
    }
    /**
     * Create the hidden dialog for entering the admin userid/password
     * @returns JQuery dialog to display
     */
    private createLoginDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>', {
            class: 'callout alert',
        }).append($('<div/>', { id: 'actionprompt' }).text("tbd")
        ).append(JTFLabeledInput('Userid:', 'text', 'userid', '', '')
        ).append(JTFLabeledInput('Password:', 'password', 'password', '', ''));
        const LoginCredentialsDlg = JTFDialog(
            'logindlg',
            'Enter Login Information',
            dlgContents,
            'oklogin',
            'Process!'
        );
        return LoginCredentialsDlg;
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates the hidden dialog used for login credentials
     */
    public createMainMenu(): JQuery<HTMLElement> {
        const result = super.createMainMenu();
        // Create the dialog for selecting which cipher to load
        result.append(this.createLoginDlg());
        return result;
    }
    /**
     * runLoginProcess prompts the user to verify the userid/password and
     *  then starts the sequence to login to convergence
     * @param msg Dialog message indication what process we are running
     * @param nextStep Code to run when the login is complete
     */
    public runLoginProcess(msg: string, nextStep: (modelService: ModelService) => void): void {
        $(".ans").empty();
        /**
         * Show the dialog for the userid/password
         */
        // Fill in the default userid/password
        $('#userid').val(this.state.userid);
        $('#password').val(this.state.password);
        // as well as the message for why we want to log in
        $("#actionprompt").text(msg);
        $('#oklogin')
            .removeAttr('disabled')
            .off('click')
            .on('click', () => {
                // They clicked ok, so retrieve the userid/password and remember it
                this.state.userid = $('#userid').val() as string;
                this.state.password = $('#password').val() as string;
                // Close the dialog and continue on the flow
                $('#logindlg').foundation('close');
                this.getSessionToken(nextStep);
            });
        $('#logindlg').foundation('open');
    }
    /**
     * getSessionToken logs into the server and gets the corresponding session token
     * We need the session token to be able to use the REST api as an admin
     * @param nextStep Code to run when the login is complete
     */
    public getSessionToken(nextStep: (modelService: ModelService) => void): void {
        const loginSettings = this.getConvergenceSettings();
        const url = loginSettings.baseUrl + "/rest/auth/login";

        $.ajax({
            url: url, // 'https://cosso.oit.ncsu.edu/rest/auth/login',
            type: 'POST',
            dataType: "json",
            data: JSON.stringify({ username: this.state.userid, password: this.state.password }),
            contentType: "application/json",
            success: (response) => {
                this.state.sessiontoken = response.body.token
                this.getAdminJWT(nextStep);
            },
            error: (err) => { this.reportFailure('Unable to connect:' + err); },
        });
    }
    /**
     * getAdminJWT retrieves the JWT that allows for admin access
     * This is used to allow us to log into the API as an admin
     * @param token Session token
     * @param nextStep Code to run when the login is complete
     */
    public getAdminJWT(nextStep: (modelService: ModelService) => void): void {
        const loginSettings = this.getConvergenceSettings();
        const url = loginSettings.baseUrl + "/rest/domains/" + loginSettings.namespace + "/" + loginSettings.domain + "2021a/convergenceUserToken";

        $.ajax({
            url: url, // 'https://cosso.oit.ncsu.edu/rest/domains/convergence/scienceolympiad/convergenceUserToken',
            type: 'GET',
            beforeSend: (xhr) => {
                xhr.setRequestHeader('Authorization', 'SessionToken ' + this.state.sessiontoken);
            },
            success: (response) => {
                this.loginAdminJWT(response.body.token, nextStep)
            },
            error: (err) => { this.reportFailure('Unable to get convergenceUserToken:' + err); },
        });
    }
    /**
     * loginAdminJWT Does the final login and then invokes the desired process when complete
     * @param jwt JWT for admin access
     * @param nextStep Code to run when the login is complete
     */
    public loginAdminJWT(jwt: string, nextStep: (modelService: ModelService) => void): void {
        const loginSettings = this.getConvergenceSettings();
        const connectUrl = ConvergenceAuthentication.formatConnectUrl(
            loginSettings.baseUrl,
            loginSettings.namespace,
            loginSettings.domain + "2021a"
        );
        this.state.jwt = jwt
        // If we requested debugging, then we need to tell Convergence about it
        if (loginSettings.debug) {
            Convergence.configureLogging({
                root: LogLevel.DEBUG,
                loggers: {
                    'protocol.ping': LogLevel.SILENT,
                },
            });
        }
        // Do the actual log into the server
        Convergence.connectWithJwt(connectUrl, jwt)
            .then(domain => {
                const modelService = domain.models();
                // Connection success! See below for the API methods available on this domainfor()
                $(".ans").append($("<div/>").text("Successfully connected"));
                nextStep(modelService)
            }).catch(err => {
                this.reportFailure('Unable to connect:' + err);
            });
    }
    /**
     * RememberUser tracks the user associations with a testmodel as well as any users which
     * are active in the system.
     * @param testid Test to associate the user with
     * @param userid user to remember
     */
    public RememberUser(testid: string, userid: string): void {
        if (userid !== undefined && userid !== "") {
            // This is a live user so we want to mark them as active so we don't delete them later
            this.state.activeUsers[userid] = true
            // If this is associated with a test, include the userid with the others for the test
            if (testid !== undefined && testid !== "") {
                if (this.state.activeTestUsers[testid] === undefined) {
                    this.state.activeTestUsers[testid] = {}
                }
                this.state.activeTestUsers[testid][userid] = true;
                console.log(this.state.activeTestUsers[testid])
            }
        }
    }
    /**
     * getTestUserString returns a comma separated string of all the users associated with a given test model
     * It is primarily use for debugging to show all the users
     * @param testid Model to get users for
     */
    public getTestUserString(testid: string): string {
        let result = "<EMPTY>"
        const testusers = this.state.activeTestUsers[testid]
        if (testusers !== undefined) {
            let extra = ""
            result = ""

            for (let userid in testusers) {
                result += extra + userid
                extra = ", "
            }
        }
        return result
    }
    /**
     * findActiveUsers locates all users known to the system.
     * This requires using the admin REST api
     * As each user is located, if they are no longer active then we need to delete them from the system.
     * This is the very last step in purging tests
     */
    public findActiveUsers() {
        //  We can find all the users by going to:
        //       https://cosso.oit.ncsu.edu/rest/domains/convergence/scienceolympiad/users
        const loginSettings = this.getConvergenceSettings();

        let url = loginSettings.baseUrl + "/rest/domains/" + loginSettings.namespace + "/" + loginSettings.domain + "/users";
        $.ajax({
            url: url,
            type: 'GET',
            beforeSend: (xhr) => {
                xhr.setRequestHeader('Authorization', 'SessionToken ' + this.state.sessiontoken);
            },
            success: (response) => {
                let cutoff = Date.now() - timestampFromMinutes(60 * 24 * 14)
                let activeUsers = 0
                let purgedUsers = 0

                let ul = $("<ul/>");
                $(".ans").append($("<h2/>").text("Active users"))
                    .append(ul)
                response.body.forEach((element: { username: any; lastLogin: number; }) => {
                    let username = element.username
                    if (this.state.userid[username] === "Y") {
                        activeUsers++
                        ul.append($("<li/>").text(username + " [Keep, still used]"))
                    } else if (element.lastLogin === undefined || element.lastLogin < cutoff) {
                        purgedUsers++
                        ul.append($("<li/>", { class: "purge" }).text(username + " [PURGE]"))
                        // Delete the user: TODO Make sure we are happy first
                        // https://cosso.oit.ncsu.edu/rest/domains/convergence/scienceolympiad/users/ABCDEFG
                        let url2 = loginSettings.baseUrl + "/rest/domains/" + loginSettings.namespace + "/" + loginSettings.domain + "/users" + "/" + username;
                        // $.ajax({
                        //     url: url2,
                        //     type: 'DELETE',
                        //     beforeSend: (xhr) => {
                        //         xhr.setRequestHeader('Authorization', 'SessionToken ' + this.state.sessiontoken);
                        //     },
                        //     success: (response) => {
                        //         ul.append(" [DELETED]")
                        //     },
                        //     error: (err) => {
                        //         ul.append(" [ERROR:" + err + "]")
                        //     }
                        // })
                    } else {
                        activeUsers++
                        ul.append($("<li/>").text(username + " -- " + timestampToFriendly(element.lastLogin)))
                    }
                });
                $(".ans").append($("<p/>").text((activeUsers + purgedUsers) + " Total users. " + activeUsers + " Kept " + purgedUsers + " Removed."))
            },
            error: (err) => { this.reportFailure('Unable to get users:' + err); },
        });

    }
    /**
     * processUsersTakes the first entry off the list found and gets the user permissions for it.
     * Once it is complete, it sets a short timer to run the next one.
     * After all tests have been processes, it proceededs to process all the active users.
     * @param modelService Domain Model service object for making requests
     */
    public processActiveTests(modelService: ModelService): void {
        let entries0 = $('li[data-purge]')
        if (entries0.length > 0) {
            let entry = entries0[0];
            let modelId = entry.getAttribute('data-purge')
            entry.removeAttribute('data-purge')
            $(entry).append(' [WILL REMOVE: ' + modelId + "]")

            // Remove the model (TODO: Enable this once we are happy with the code)
            modelService.remove(modelId).then(() => {
                $(entry).append($("<b/>").text("[REMOVED]"))
                setTimeout(() => { this.processActiveTests(modelService) }, 1000);
            }).catch(error => {
                $(entry).append($("<b/>").text("[ERROR:" + error + "]"))
                setTimeout(() => { this.processActiveTests(modelService) }, 1000);
            })
        } else {

            // Get the list of all remaining models to process
            let entries = $('li[data-entry]');
            if (entries.length > 0) {
                // We have at least one so get it
                let entry = entries[0];
                // Find the model id and if it is associated with a test model, get that test model
                let modelId = entry.getAttribute('data-entry')
                entry.removeAttribute('data-entry')
                let testId = entry.getAttribute('data-testid')
                if (testId === "" || testId === null) {
                    testId = undefined
                }
                let isconvergence = (entry.getAttribute('data-convergence') == "1")

                if (isconvergence) {
                    // Get the permissions associated with the model
                    const permissionManager = modelService.permissions(modelId);
                    permissionManager
                        .getAllUserPermissions()
                        .then((allPermissions) => {
                            let removes = ""
                            let userlist = ""
                            let extra = ""
                            let extrau = ""
                            allPermissions.forEach((permission, userid) => {
                                userlist += extrau + userid
                                extrau = ", "
                                if (testId !== undefined) {
                                    // If this is a source or answermodel, then we have to remember that this
                                    // user is associated with the test model
                                    this.RememberUser(testId, userid)
                                } else if (permission.remove) {
                                    // If the user has remove permissions, we always keep them on this model
                                    this.RememberUser(modelId, userid)
                                } else if (this.state.activeTestUsers[modelId][userid] !== true) {
                                    // The user is not active any more, so just remove them from this model
                                    allPermissions.delete(userid);
                                    removes += extra + userid
                                    extra = ", "
                                }
                            })
                            entry.append(" [Processed:" + userlist + " testid=" + testId + " == " + this.getTestUserString(testId) + "]");
                            // Process the next one in the list
                            setTimeout(() => { this.processActiveTests(modelService) }, 1);
                        })
                        .catch(error => {
                            // We couldn't get permissions, so report it and go onto the next one
                            entry.append(" [Unable to get permission:" + error + "]")
                            setTimeout(() => { this.processActiveTests(modelService) }, 1);
                        })
                } else {
                    // New model type. Use 
                    this.getRealtimePermissions(modelId).then((permissionset) => {
                        let removes = ""
                        let removeset = []
                        let userlist = ""
                        let extra = ""
                        let extrau = ""

                        for (let userid in permissionset) {
                            userlist += extrau + userid
                            extrau = ", "
                            if (testId !== undefined) {
                                // If this is a source or answermodel, then we have to remember that this
                                // user is associated with the test model
                                this.RememberUser(testId, userid)
                            } else if (permissionset[userid].remove) {
                                // If the user has remove permissions, we always keep them on this model
                                this.RememberUser(modelId, userid)
                            } else if (this.state.activeTestUsers[modelId][userid] !== true) {
                                // The user is not active any more, so just remove them from this model
                                removeset = removeset.concat(userid)
                                removes += extra + userid
                                extra = ", "
                            }
                            // See if this is one that we need to update permissions on
                            if (testId === undefined) {
                                //
                                let newUserList = this.getTestUserString(modelId)
                                if (removes === "") {
                                    entry.append(" [Processed: NO CHANGE USERS:" + newUserList + "]")
                                } else {
                                    entry.append(" [Processed: Remove Users:" + removes + "]")
                                    // Update the permissions now that we changed them TODO:
                                    // permissionManager.setAllUserPermissions(allPermissions)
                                    //     .then(() => { entry.append(" [UPDATED]") })
                                    //     .catch(error => { entry.append(" [ERROR:" + error + "]") })
                                }
                            } else {
                                entry.append(" [Processed:" + userlist + " testid=" + testId + " == " + this.getTestUserString(testId) + "]");
                            }
                        }

                    })
                        .catch(error => {
                            // We couldn't get permissions, so report it and go onto the next one
                            entry.append(" [Unable to get realtime permission:" + error + "]")
                            setTimeout(() => { this.processActiveTests(modelService) }, 1);
                        })
                }
            } else {
                // No more models to process, so go to the last step and process the active users to purge the ones we don't need anymore
                this.findActiveUsers();
                $(".ans").append($("<h2/>").text("DONE"))
            }
        }
    }
    /**
     * findAllModels finds all models of a given type and adds them to the page to be processed
     * @param modelService Domain Model service object for making requests
     * @param realtimeType type of model to process.  One of: sourcemodel|testmodel|answertemplate
     * @param nextStep 
     */
    public findAllModels(modelService: ModelService, realtimeType: IRealtimeObject, nextStep: (modelService: ModelService) => void): void {
        this.getRealtimeMetadata(realtimeType)
            .then(results => {
                // For each model we just need to put in a bullet item with the modelid and testid if is present
                let ul = $("<ul/>");
                $(".ans")
                    .append($("<h2/>").text(realtimeType))
                    .append(ul)
                results.forEach((result) => {
                    ul.append($("<li/>", { 'data-entry': result.id, 'data-testid': result.testid }).text(result.id));
                })
                nextStep(modelService)
            })
            .catch(error => {
                this.reportFailure('error querying model:' + error)
            })
    }
    /**
     * findAllTestModels finds all of the tests.  Note that this must be last because the processing of it
     * depends on the Answer Templates and Source Models being processed first so that we truely know who should 
     * be on the test.
     * @param modelService Domain Model service object for making requests
     */
    public findAllTestModels(modelService: ModelService): void {
        this.findAllModels(modelService, 'testmodel', () => { this.processActiveTests(modelService) });
    }
    /**
     * findAllAnswerTemplates finds all active answer templates
     * @param modelService Domain Model service object for making requests
     */
    public findAllAnswerTemplates(modelService: ModelService): void {
        this.findAllModels(modelService, 'answertemplate', () => { this.findAllTestModels(modelService) });
    }
    /**
     * findAllSourceModels finds all the active source models in the system
     * @param modelService Domain Model service object for making requests
     */
    public findAllSourceModels(modelService: ModelService): void {
        this.findAllModels(modelService, 'sourcemodel', () => { this.findAllAnswerTemplates(modelService) });
    }
    /**
     * doPurge does the work of purging old models
     * @param modelService Domain Model service object for making requests
     */
    public doPurge(modelService: ModelService): void {
        $(".ans").empty().append($("<div/>").text("Purging tests."))

        let cutoff = Date.now() - timestampFromMinutes(60 * 24 * 14)
        // Start out by finding all the models which are older than 2 weeks and can be purged.
        modelService
            .query('SELECT endtime,assigned,testid FROM codebusters_answers')
            .then(results => {
                // We have some models, so first let's get a working space to record what we learn
                // activeUsers tracks all users which are expected to still reference models when we are complete
                // If we have been here before, just wipe out the map, otherwise create a new one to work fomr
                if (this.state.activeUsers !== undefined) {
                    this.state.activeUsers.clear()
                } else {
                    this.state.activeUsers = new Map()
                }
                let totalAnswers = 0
                let totalPurged = 0
                // Make sure we never delete the admin accounts
                this.state.activeUsers['admin'] = true
                this.state.activeUsers['rlabaza'] = true
                // activeTestUsers tracks which users are associated with a specific test
                if (this.state.activeTestUsers !== undefined) {
                    this.state.activeTestUsers.clear()
                } else {
                    this.state.activeTestUsers = new Map()
                }
                // Display a list of all the active answermodels along with who is assigned to the model
                let ul = $("<ul/>");
                $(".ans").append(ul)
                // Work through the list of all models returned
                results.data.forEach((result) => {
                    // Construct the list of users so we can display it
                    let thisusers = ""
                    let extra = ""
                    // If this test is more than 2 weeks old we can purge it
                    let purge = (result.data.endtime < cutoff)

                    // Figure out what users we have in the answer model
                    result.data.assigned.forEach((assigned: { userid: string; }) => {
                        // As long as it isn't blank we want to track them
                        if (assigned.userid !== "") {
                            thisusers += extra + assigned.userid
                            extra = ", "
                            if (!purge) {
                                this.RememberUser(result.data.testid, assigned.userid)
                                // If this test is active then we want to keep the users on it.
                                this.state.activeUsers[assigned.userid] = true
                            }
                        }
                    })
                    // Let us know what the plan is for the test.  Note that if it has data-entry associated with it
                    // it will be processed to extract the permissions as part of the final steps
                    if (purge) {
                        ul.append($("<li/>", { class: "purge", "data-purge": result.modelId }).text(result.modelId + " endtime:" + timestampToFriendly(result.data.endtime) + " -- " + thisusers));
                        totalPurged++
                        // Remove the model (TODO: Enable this once we are happy with the code)
                        // modelService.remove(result.modelId).then(() => {
                        //     ul.append($("<b/>").text("[REMOVED]"))
                        // }).catch(error => {
                        //     ul.append($("<b/>").text("[ERROR:" + error + "]"))
                        // })
                    } else {
                        totalAnswers++
                        ul.append($("<li/>", { 'data-entry': result.modelId, 'data-testid': result.data.testid, 'data-convergence': 1 }).text(result.modelId + " Purge:" + purge + " endtime:" + timestampToFriendly(result.data.endtime) + " -- " + thisusers));
                    }
                })
                $(".ans").append($("<p/>").text((totalAnswers + totalPurged) + " Answer Models. " + totalAnswers + " Kept " + totalPurged + " Removed."))
                // We have all the answer models, so next we go for the source models
                this.findAllSourceModels(modelService);
            })
            .catch(error => {
                this.reportFailure('error querying model:' + error)
            })
    }
    /**
     * PurgeOldTests purges any tests which are more than 2 weeks old
     */
    public PurgeOldTests(): void {
        $(".ans").empty().append("Looking for tests");

        if (!this.confirmedLoggedIn(' in order to purge tests.', $(".ans"))) {
            return;
        }

        this.runLoginProcess("This will purge all taken tests older than two weeks from the server.", (modelService: ModelService) => { this.doPurge(modelService) })
    }
    /**
  * Creates convergence domain users if they do not exist already.
  * @param modelService Domain Model service object for making requests
  * @param usernames User to ensure exists
  */
    public ensureUsersExist2(usernames: string[]): Promise<unknown> {
        const settings = this.getConvergenceSettings();
        const convergenceNamespace = settings.namespace;
        const convergenceDomainID = settings.domain;
        const parameters: EnsureUsersExistParameters = {
            convergenceDomainID: convergenceDomainID,
            convergenceNamespace: convergenceNamespace,
            usernames: usernames,
        };

        const token = this.getConfigString(CipherHandler.KEY_CONVERGENCE_TOKEN, '');
        return this.api.ensureUsersExist(token, parameters);
    }
    /**
 * doPurge does the work of purging old models
 * @param modelServiceOld Domain Model service object for making requests
 */
    public doCopyOne(modelServiceOld: ModelService, modelServiceNew: ModelService): void {
        if (this.state.currentslot === 0) {
            $(".ans").empty()
                .append($("<div/>").text("Copying Tests."))
                .append($("<ul/>", { id: 'copylist' }))
        }

        if (this.state.currentslot < models.length) {
            const modelId = models[this.state.currentslot]
            const elem = $("<li/>").text(modelId)
            this.state.currentslot++;
            $("#copylist").append(elem)

            modelServiceOld
                .open(modelId)
                .then((model: RealTimeModel) => {
                    const contents = model.root().value() as IAnswerTemplate;
                    model.close()
                    let toadd: string[] = []

                    const permissionManagerOld = modelServiceOld.permissions(modelId);
                    permissionManagerOld
                        .getAllUserPermissions()
                        .then((allPermissions) => {
                            allPermissions.forEach((_permission, userid) => {
                                toadd.push(userid)
                            })

                            // permissionManager.setAllUserPermissions(allPermissions).catch((error) => {
                            //     this.reportFailure('Unable to set model permissions: ' + error);
                            // });
                            //////////////////

                            if (toadd.length > 0) {
                                this.ensureUsersExist2(toadd).then(() => {



                                    elem.append(" [Ensure Users Successful]")


                                    // They exist. now we need to create the model
                                    modelServiceNew.create({
                                        collection: 'codebusters_answers',
                                        overrideCollectionWorldPermissions: false,
                                        data: contents,
                                        id: modelId,
                                    }).then((newmodelid) => {
                                        elem.append(" [Created id=" + newmodelid + "]")
                                        // And set the permissions
                                        const permissionManagerNew = modelServiceNew.permissions(newmodelid)
                                        permissionManagerNew.setAllUserPermissions(allPermissions).then(() => {
                                            elem.append(" [Permissions Set]")
                                            setTimeout(() => { this.doCopyOne(modelServiceOld, modelServiceNew) }, 10);

                                        })
                                            .catch((error) => {
                                                elem.append(" [ERROR setting permissions:" + error + "]")
                                                setTimeout(() => { this.doCopyOne(modelServiceOld, modelServiceNew) }, 10);
                                            })
                                    })
                                        .catch((error) => {
                                            elem.append(" [ERROR Creating Model:" + error + "]")
                                            const permissionManagerNew = modelServiceNew.permissions(modelId)
                                            permissionManagerNew.setAllUserPermissions(allPermissions).then(() => {
                                                elem.append(" [Permissions Set]")
                                                setTimeout(() => { this.doCopyOne(modelServiceOld, modelServiceNew) }, 10);

                                            })
                                                .catch((error) => {
                                                    elem.append(" [ERROR setting permissions:" + error + "]")
                                                    setTimeout(() => { this.doCopyOne(modelServiceOld, modelServiceNew) }, 10);
                                                })
                                        })

                                })
                                    .catch((error) => {
                                        elem.append(" [Ensure users Error:" + error + "]")
                                        setTimeout(() => { this.doCopyOne(modelServiceOld, modelServiceNew) }, 10);
                                    })
                            } else {
                                elem.append(" [Successfully opened]")
                                setTimeout(() => { this.doCopyOne(modelServiceOld, modelServiceNew) }, 10);
                            }
                        })
                        .catch(error => {
                            elem.append(" [ERROR getting Permissions:" + error + "]")
                        })
                })
                .catch(error => {
                    elem.append(" [ERROR:" + error + "]")
                })


        }
    }
    public doCopy(modelService: ModelService, jwt: string): void {
        const loginSettings = this.getConvergenceSettings();
        const connectUrl = ConvergenceAuthentication.formatConnectUrl(
            loginSettings.baseUrl,
            loginSettings.namespace,
            loginSettings.domain
        );
        const options: Convergence.IConvergenceOptions = {
            protocol: { defaultRequestTimeout: 30 },
            connection: { timeout: 30 },
        };
        options.connection.timeout = 30;
        // Do the actual log into the server
        Convergence.connectWithJwt(connectUrl, jwt, options)
            // Convergence.connect(connectUrl, this.state.userid, this.state.password)
            .then(domain => {
                const modelServiceNew = domain.models();
                // Connection success! See below for the API methods available on this domainfor()
                $(".ans").append($("<div/>").text("Successfully connected"));
                this.doCopyOne(modelService, modelServiceNew)
            }).catch(err => {
                this.reportFailure('Unable to connect:' + err);
            });

    }

    /**
     * getSessionToken logs into the server and gets the corresponding session token
     * We need the session token to be able to use the REST api as an admin
     * @param nextStep Code to run when the login is complete
     */
    public getSessionToken2(modelServiceOld: ModelService): void {
        const loginSettings = this.getConvergenceSettings();
        const url = loginSettings.baseUrl + "/rest/auth/login";

        $.ajax({
            url: url, // 'https://cosso.oit.ncsu.edu/rest/auth/login',
            type: 'POST',
            dataType: "json",
            data: JSON.stringify({ username: this.state.userid, password: this.state.password }),
            contentType: "application/json",
            success: (response) => {
                this.state.sessiontoken = response.body.token
                this.getAdminJWT2(modelServiceOld);
            },
            error: (err) => { this.reportFailure('Unable to connect:' + err); },
        });
    }
    /**
     * getAdminJWT retrieves the JWT that allows for admin access
     * This is used to allow us to log into the API as an admin
     * @param token Session token
     * @param nextStep Code to run when the login is complete
     */
    public getAdminJWT2(modelServiceOld: ModelService): void {
        const loginSettings = this.getConvergenceSettings();
        const url = loginSettings.baseUrl + "/rest/domains/" + loginSettings.namespace + "/" + loginSettings.domain + "/convergenceUserToken";

        $.ajax({
            url: url, // 'https://cosso.oit.ncsu.edu/rest/domains/convergence/scienceolympiad/convergenceUserToken',
            type: 'GET',
            beforeSend: (xhr) => {
                xhr.setRequestHeader('Authorization', 'SessionToken ' + this.state.sessiontoken);
            },
            success: (response) => {
                this.doCopy(modelServiceOld, response.body.token)
            },
            error: (err) => { this.reportFailure('Unable to get convergenceUserToken:' + err); },
        });
    }

    /**
     * CopyTests copies tests to the new section
     */
    public CopyTests(): void {
        $(".ans").empty().append("Looking for tests");

        if (!this.confirmedLoggedIn(' in order to copy tests.', $(".ans"))) {
            return;
        }
        this.state.currentslot = 0
        this.runLoginProcess("This will copy all tests to the new folder.", (modelService: ModelService) => { this.getSessionToken2(modelService) })
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();

        $('#purge')
            .off('click')
            .on('click', () => {
                this.PurgeOldTests();
            });
        $('#copytest')
            .off('click')
            .on('click', () => {
                this.CopyTests();
            });

    }
}
