import type { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import Workspace from "@/layouts/workspace";
import { useRecoilState } from "recoil";
import { useRouter } from "next/router";
import { useMemo } from "react";
import prisma, { document } from "@/utils/database";
import { GetServerSideProps } from "next";
import randomText from "@/utils/randomText";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { IconFileText, IconPlus, IconClock, IconUser, IconArrowLeft } from "@tabler/icons";
import clsx from 'clsx';
import { Toaster } from 'react-hot-toast';


export const getServerSideProps = withPermissionCheckSsr(async (context: any) => {
	const { id } = context.query;
	const userid = context.req.session.userid;
	if (!userid) {
		return {
			redirect: {
				destination: '/login',
			}
		}
	}
	if (!id) {
		return {
			notFound: true,
		};
	};
	const user = await prisma.user.findFirst({
		where: {
			userid: userid
		},
		include: {
			roles: {
				where: {
					workspaceGroupId: parseInt(id as string)
				}
			}
		}
	});
	if (!user) {
		return {
			redirect: {
				destination: '/login',
			}
		};
	}

	if (user.roles[0].permissions.includes('manage_docs') || user.roles[0].isOwnerRole) {
		const docs = await prisma.document.findMany({
			where: {
				workspaceGroupId: parseInt(id as string)
			},
			include: {
				owner: {
					select: { 
						username: true,
						picture: true
					}
				}
			}
		});
		return {
			props: {
				documents: (JSON.parse(JSON.stringify(docs, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) as typeof docs)
			}
		}
	}
	const docs = await prisma.document.findMany({
		where: {
			workspaceGroupId: parseInt(id as string),
			roles: {
				some: {
					id: user.roles[0].id
				}
			}
		},
		include: {
			owner: {
				select: {
					username: true,
					picture: true,
				}
			}
		}
	})
	return {
		props: {
			documents: (JSON.parse(JSON.stringify(docs, (key, value) => (typeof value === 'bigint' ? value.toString() : value))))
		},
	}
});

type pageProps = {
	documents: (document & { owner: { username: string, picture: string } })[]
}
const Home: pageWithLayout<pageProps> = ({ documents }) => {
	const [login, setLogin] = useRecoilState(loginState);
	const text = useMemo(() => randomText(login.displayname), []);
	const router = useRouter();

	const goToGuide = (id: string) => {
		router.push(`/workspace/${router.query.id}/docs/${id}`);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<Toaster position="bottom-center" />
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				{/* Header */}
				<div className="flex items-center gap-3 mb-6">
					<button 
						onClick={() => router.back()}
						className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
						aria-label="Go back"
					>
						<IconArrowLeft className="w-5 h-5" />
					</button>
					<div>
						<h1 className="text-xl font-medium text-gray-900">Documents</h1>
						<p className="text-sm text-gray-500">Create and manage your workspace documentation</p>
					</div>
				</div>

				{/* New Document Button */}
				<button 
					onClick={() => router.push(`/workspace/${router.query.id}/docs/new`)}
					className="w-full bg-white rounded-lg shadow-sm p-4 mb-4 hover:shadow-md transition-shadow group"
				>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
							<IconPlus className="w-5 h-5 text-primary" />
						</div>
						<div className="flex-1 text-left">
							<h3 className="text-lg font-medium text-gray-900">
								New Document
							</h3>
							<p className="text-sm text-gray-500 mt-0.5">
								Create a new document for your workspace
							</p>
						</div>
					</div>
				</button>

				{/* Documents Grid */}
				{documents.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{documents.map((document) => (
							<button
								key={document.id}
								onClick={() => goToGuide(document.id)}
								className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-all text-left group"
							>
								<div className="flex items-start gap-3">
									<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
										<IconFileText className="w-5 h-5 text-primary" />
									</div>
									<div className="flex-1">
										<h3 className="text-base font-medium text-gray-900 group-hover:text-primary transition-colors">
											{document.name}
										</h3>
										<div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
											<div className="flex items-center gap-1.5">
												<IconUser className="w-3.5 h-3.5" />
												<span>{document.owner?.username}</span>
											</div>
											<div className="flex items-center gap-1.5">
												<IconClock className="w-3.5 h-3.5" />
												<span>{new Date(document.createdAt).toLocaleDateString()}</span>
											</div>
										</div>
									</div>
								</div>
							</button>
						))}
					</div>
				) : (
					<div className="bg-white rounded-lg shadow-sm p-8 text-center">
						<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
							<IconFileText className="w-8 h-8 text-primary" />
						</div>
						<h3 className="text-lg font-medium text-gray-900 mb-1">
							No documents yet
						</h3>
						<p className="text-sm text-gray-500 mb-4">
							Get started by creating your first document
						</p>
						<button
							onClick={() => router.push(`/workspace/${router.query.id}/docs/new`)}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary/90 transition-colors"
						>
							<IconPlus className="w-4 h-4" />
							Create Document
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

Home.layout = Workspace;

export default Home;
